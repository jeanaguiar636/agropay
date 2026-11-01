/**
 * AgroPay / AgroTrade VIP — API + static assets (Cloudflare Workers + D1)
 *
 * Routes:
 *   POST /api/register        { username, email, password }
 *   POST /api/login           { email, password }
 *   POST /api/logout
 *   GET  /api/me              -> { user, settings }
 *   POST /api/trade           { commodity, side: "up"|"down", stake }
 *   GET  /api/history         -> [ trade... ]
 *   POST /api/settings        { startingBalance }  (reset demo balance)
 *   GET  /api/commodities
 *   GET  /api/admin/users     (admin only)
 *   POST /api/admin/balance   { userId, newBalance } (admin only)
 *   GET  /api/admin/stats     (admin only)
 *
 * Everything else falls through to the static assets in ./public.
 */

const SESSION_COOKIE = "agropay_session";
const SESSION_TTL_DAYS = 7;
const PBKDF2_ITERATIONS = 150000;
const MAX_STAKE = 1000000;
const STARTING_BALANCE = 1000;
const WIN_MULTIPLIER = 1.7; // payout on a winning round (70% profit)

const COMMODITIES = [
  { id: "cafe", name: "Café arábica", unit: "saca", price: 342.5, change: 4.8, icon: "☕" },
  { id: "feijao", name: "Feijão carioca", unit: "saca", price: 210.0, change: -1.2, icon: "🫘" },
  { id: "arroz", name: "Arroz premium", unit: "saca", price: 540.0, change: 2.1, icon: "🌾" },
  { id: "trigo", name: "Trigo especial", unit: "saca", price: 320.0, change: 0.9, icon: "🍞" },
  { id: "milho", name: "Milho amarelo", unit: "saca", price: 178.0, change: -3.4, icon: "🌽" },
  { id: "soja", name: "Soja", unit: "saca", price: 268.0, change: 1.6, icon: "🫛" },
];

/* ------------------------------------------------------------------ utils */

const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });

const fail = (message, status = 400, extraHeaders = {}) =>
  json({ error: message }, status, extraHeaders);

const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
const randomToken = (size = 32) =>
  toBase64(crypto.getRandomValues(new Uint8Array(size))).replace(/[+/=]/g, "");

async function hashPassword(password, saltBase64) {
  const salt = saltBase64 ? fromBase64(saltBase64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return { salt: toBase64(salt), hash: toBase64(bits) };
}

/** Constant-time-ish string comparison. */
function safeEqual(a = "", b = "") {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return idx === -1 ? [part, ""] : [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      }),
  );
}

function sessionCookie(token, request, maxAgeSeconds) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

function isAdminEmail(email, env) {
  const list = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email || "").trim().toLowerCase());
}

const publicUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  balance: Number(row.balance) || 0,
  isAdmin: Boolean(row.is_admin),
  createdAt: row.created_at,
});

/* ------------------------------------------------------------------- schema */

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       username TEXT NOT NULL,
       email TEXT NOT NULL UNIQUE,
       password_hash TEXT NOT NULL,
       password_salt TEXT NOT NULL,
       balance REAL NOT NULL DEFAULT ${STARTING_BALANCE},
       is_admin INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT (datetime('now'))
     )`,
    `CREATE TABLE IF NOT EXISTS sessions (
       token TEXT PRIMARY KEY,
       user_id INTEGER NOT NULL,
       expires_at TEXT NOT NULL,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`,
    `CREATE TABLE IF NOT EXISTS trades (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER NOT NULL,
       commodity TEXT NOT NULL,
       side TEXT NOT NULL,
       stake REAL NOT NULL,
       entry_price REAL NOT NULL,
       exit_price REAL NOT NULL,
       outcome TEXT NOT NULL,
       payout REAL NOT NULL,
       net REAL NOT NULL,
       created_at TEXT NOT NULL DEFAULT (datetime('now')),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     )`,
    `CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id, id DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  ];
  await env.DB.batch(statements.map((sql) => env.DB.prepare(sql)));
  schemaReady = true;
}

/* ------------------------------------------------------------------- auth */

async function currentUser(request, env) {
  const token = readCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')`,
  )
    .bind(token)
    .first();
  return row || null;
}

async function createSession(env, userId) {
  const token = randomToken();
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_TTL_DAYS} days'))`,
  )
    .bind(token, userId)
    .run();
  return token;
}

async function handleRegister(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Corpo do pedido inválido.");
  }

  const username = String(body.username || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (username.length < 2) return fail("Informe um nome com pelo menos 2 caracteres.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Informe um e-mail válido.");
  if (password.length < 8) return fail("A palavra-passe precisa ter pelo menos 8 caracteres.");

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return fail("Este e-mail já está registado.", 409);

  const { salt, hash } = await hashPassword(password);
  const isFirstUser = !(await env.DB.prepare("SELECT id FROM users LIMIT 1").first());
  const admin = isAdminEmail(email, env) || isFirstUser ? 1 : 0;

  const result = await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, password_salt, balance, is_admin)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(username, email, hash, salt, STARTING_BALANCE, admin)
    .run();

  const userId = result.meta?.last_row_id;
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  const token = await createSession(env, user.id);

  return json({ success: true, user: publicUser(user) }, 201, {
    "set-cookie": sessionCookie(token, request, SESSION_TTL_DAYS * 86400),
  });
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Corpo do pedido inválido.");
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (!email || !password) return fail("Preencha o e-mail e a palavra-passe.");

  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return fail("E-mail ou palavra-passe incorretos.", 401);

  const { hash } = await hashPassword(password, user.password_salt);
  if (!safeEqual(hash, user.password_hash)) return fail("E-mail ou palavra-passe incorretos.", 401);

  // Promote to admin if the deployment allows this e-mail.
  if (isAdminEmail(user.email, env) && !user.is_admin) {
    await env.DB.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").bind(user.id).run();
    user.is_admin = 1;
  }

  // Rotate the session id on every login.
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.id).run();
  const token = await createSession(env, user.id);

  return json({ success: true, user: publicUser(user) }, 200, {
    "set-cookie": sessionCookie(token, request, SESSION_TTL_DAYS * 86400),
  });
}

async function handleLogout(request, env) {
  const token = readCookies(request)[SESSION_COOKIE];
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return json({ success: true }, 200, { "set-cookie": sessionCookie("", request, 0) });
}

/* ----------------------------------------------------------------- trading */

async function handleTrade(request, env, user) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Corpo do pedido inválido.");
  }

  const commodity = COMMODITIES.find((item) => item.id === body.commodity || item.name === body.commodity);
  if (!commodity) return fail("Commodity inválida.");

  const side = body.side === "down" ? "down" : body.side === "up" ? "up" : null;
  if (!side) return fail('A direção deve ser "up" ou "down".');

  const stake = Math.round(Number(body.stake));
  if (!Number.isFinite(stake) || stake < 1) return fail("O valor da operação deve ser de pelo menos 1 ZP.");
  if (stake > MAX_STAKE) return fail(`O valor máximo por operação é ${MAX_STAKE} ZP.`);

  const balance = Number(user.balance) || 0;
  if (stake > balance) return fail("Saldo insuficiente. Reponha o saldo de demonstração para continuar.", 402);

  // Simulated round: 50% chance of a move in the chosen direction.
  const won = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 < 0.5;
  const move = (Math.random() * 2.2 + 0.4) / 100; // 0.4% .. 2.6%
  const entryPrice = commodity.price;
  const exitPrice = Number((entryPrice * (1 + (won ? move : -move))).toFixed(2));
  const payout = won ? Number((stake * WIN_MULTIPLIER).toFixed(2)) : 0;
  const net = Number((payout - stake).toFixed(2));
  const newBalance = Number((balance + net).toFixed(2));

  // Guard the write with the balance we read, so concurrent rounds cannot overspend.
  const updated = await env.DB.prepare(
    "UPDATE users SET balance = ? WHERE id = ? AND balance = ?",
  )
    .bind(newBalance, user.id, balance)
    .run();

  if (!updated.meta?.changes) return fail("Operação em conflito. Tente novamente.", 409);

  const inserted = await env.DB.prepare(
    `INSERT INTO trades (user_id, commodity, side, stake, entry_price, exit_price, outcome, payout, net)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      user.id,
      commodity.name,
      side,
      stake,
      entryPrice,
      exitPrice,
      won ? "win" : "loss",
      payout,
      net,
    )
    .run();

  return json({
    success: true,
    trade: {
      id: inserted.meta?.last_row_id,
      commodity: commodity.name,
      side,
      stake,
      entryPrice,
      exitPrice,
      outcome: won ? "win" : "loss",
      payout,
      net,
      createdAt: new Date().toISOString(),
    },
    balance: newBalance,
  });
}

async function handleHistory(env, user) {
  const { results } = await env.DB.prepare(
    `SELECT id, commodity, side, stake, entry_price, exit_price, outcome, payout, net, created_at
       FROM trades WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
  )
    .bind(user.id)
    .all();

  return json(
    (results || []).map((row) => ({
      id: row.id,
      commodity: row.commodity,
      side: row.side,
      stake: Number(row.stake),
      entryPrice: Number(row.entry_price),
      exitPrice: Number(row.exit_price),
      outcome: row.outcome,
      payout: Number(row.payout),
      net: Number(row.net),
      createdAt: row.created_at,
    })),
  );
}

async function handleResetBalance(env, user, body) {
  const requested = Number(body.startingBalance);
  const amount = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_STAKE) : STARTING_BALANCE;
  await env.DB.prepare("UPDATE users SET balance = ? WHERE id = ?").bind(amount, user.id).run();
  return json({ success: true, balance: amount });
}

/* ------------------------------------------------------------------- admin */

async function handleAdminUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.username, u.email, u.balance, u.is_admin, u.created_at,
            (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id) AS trades,
            (SELECT COALESCE(SUM(t.net), 0) FROM trades t WHERE t.user_id = u.id) AS net
       FROM users u ORDER BY u.id ASC`,
  ).all();

  return json(
    (results || []).map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      balance: Number(row.balance) || 0,
      isAdmin: Boolean(row.is_admin),
      createdAt: row.created_at,
      trades: Number(row.trades) || 0,
      net: Number(row.net) || 0,
    })),
  );
}

async function handleAdminBalance(env, body) {
  const userId = Number(body.userId);
  const newBalance = Number(body.newBalance);
  if (!Number.isInteger(userId) || userId <= 0) return fail("Utilizador inválido.");
  if (!Number.isFinite(newBalance) || newBalance < 0 || newBalance > MAX_STAKE) {
    return fail(`O saldo deve estar entre 0 e ${MAX_STAKE} ZP.`);
  }
  const result = await env.DB.prepare("UPDATE users SET balance = ? WHERE id = ?")
    .bind(Number(newBalance.toFixed(2)), userId)
    .run();
  if (!result.meta?.changes) return fail("Utilizador não encontrado.", 404);
  return json({ success: true });
}

async function handleAdminStats(env) {
  const totals = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM trades) AS trades,
            (SELECT COALESCE(SUM(stake), 0) FROM trades) AS volume,
            (SELECT COALESCE(SUM(balance), 0) FROM users) AS balances`,
  ).first();

  return json({
    users: Number(totals?.users) || 0,
    trades: Number(totals?.trades) || 0,
    volume: Number(totals?.volume) || 0,
    balances: Number(totals?.balances) || 0,
  });
}

/* ------------------------------------------------------------------ router */

async function routeApi(request, env) {
  const { pathname } = new URL(request.url);
  const method = request.method;

  if (pathname === "/api/health") return json({ ok: true });

  if (pathname === "/api/commodities" && method === "GET") return json(COMMODITIES);

  if (pathname === "/api/register" && method === "POST") return handleRegister(request, env);
  if (pathname === "/api/login" && method === "POST") return handleLogin(request, env);
  if (pathname === "/api/logout" && method === "POST") return handleLogout(request, env);

  const user = await currentUser(request, env);

  if (pathname === "/api/me" && method === "GET") {
    if (!user) return fail("Não autenticado.", 401);
    return json({ user: publicUser(user), startingBalance: STARTING_BALANCE });
  }

  if (pathname === "/api/trade" && method === "POST") {
    if (!user) return fail("Não autenticado.", 401);
    return handleTrade(request, env, user);
  }

  if (pathname === "/api/history" && method === "GET") {
    if (!user) return fail("Não autenticado.", 401);
    return handleHistory(env, user);
  }

  if (pathname === "/api/settings" && method === "POST") {
    if (!user) return fail("Não autenticado.", 401);
    let body = {};
    try {
      body = await request.json();
    } catch {
      /* empty body is fine */
    }
    return handleResetBalance(env, user, body);
  }

  if (pathname.startsWith("/api/admin")) {
    if (!user) return fail("Não autenticado.", 401);
    if (!user.is_admin) return fail("Acesso restrito a administradores.", 403);

    if (pathname === "/api/admin/users" && method === "GET") return handleAdminUsers(env);
    if (pathname === "/api/admin/stats" && method === "GET") return handleAdminStats(env);
    if (pathname === "/api/admin/balance" && method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return fail("Corpo do pedido inválido.");
      }
      return handleAdminBalance(env, body);
    }
  }

  return fail("Rota não encontrada.", 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith("/api/");

    if (request.method === "OPTIONS" && isApi) {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": url.origin,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-allow-credentials": "true",
        },
      });
    }

    try {
      await ensureSchema(env);
      if (isApi) return await routeApi(request, env);

      // Static assets (.html files are served by their plain names).
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error("worker error:", err && err.stack ? err.stack : err);
      if (isApi) return fail("Erro interno do servidor.", 500);
      return new Response("Erro interno do servidor.", { status: 500 });
    }
  },
};
