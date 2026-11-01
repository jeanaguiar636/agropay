/**
 * Integration tests for the AgroPay worker API.
 *
 * Requires a running instance (`npm run dev`). Override the target with
 * BASE_URL=https://your-worker.workers.dev npm test
 */
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8787";

let serverUp = false;

async function call(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

const uniqueEmail = () => `user${Date.now()}${Math.floor(Math.random() * 1e4)}@teste.local`;

before(async () => {
  try {
    const res = await fetch(BASE_URL + "/api/health");
    serverUp = res.ok;
  } catch {
    serverUp = false;
  }
  if (!serverUp) console.warn(`\n[skip] No server at ${BASE_URL} — run "npm run dev" first.\n`);
});

const maybe = (name, fn) =>
  test(name, async (t) => {
    if (!serverUp) return t.skip("server not running");
    return fn(t);
  });

describe("AgroPay API", () => {
  maybe("GET /api/health responde ok", async () => {
    const { status, data } = await call("/api/health");
    assert.equal(status, 200);
    assert.equal(data.ok, true);
  });

  maybe("GET /api/commodities devolve a lista de ativos", async () => {
    const { status, data } = await call("/api/commodities");
    assert.equal(status, 200);
    assert.ok(Array.isArray(data) && data.length >= 4);
    assert.ok(data.every((a) => a.id && a.name && typeof a.price === "number"));
  });

  maybe("registo cria utilizador com saldo inicial e sessão", async () => {
    const email = uniqueEmail();
    const { status, data, setCookie } = await call("/api/register", {
      method: "POST",
      body: { username: "Teste", email, password: "senhaSegura1" },
    });
    assert.equal(status, 201);
    assert.equal(data.user.email, email);
    assert.equal(data.user.balance, 1000);
    assert.ok(setCookie && setCookie.includes("agropay_session"));
  });

  maybe("registo rejeita palavra-passe curta", async () => {
    const { status, data } = await call("/api/register", {
      method: "POST",
      body: { username: "Curta", email: uniqueEmail(), password: "123" },
    });
    assert.equal(status, 400);
    assert.match(data.error, /8 caracteres/);
  });

  maybe("registo rejeita e-mail duplicado", async () => {
    const email = uniqueEmail();
    const body = { username: "Dup", email, password: "senhaSegura1" };
    await call("/api/register", { method: "POST", body });
    const { status } = await call("/api/register", { method: "POST", body });
    assert.equal(status, 409);
  });

  maybe("login com senha errada devolve 401", async () => {
    const email = uniqueEmail();
    await call("/api/register", { method: "POST", body: { username: "A", email, password: "senhaSegura1" } });
    const { status } = await call("/api/login", { method: "POST", body: { email, password: "errada123" } });
    assert.equal(status, 401);
  });

  maybe("fluxo completo: registo → trade → histórico → logout", async (t) => {
    const email = uniqueEmail();
    const reg = await call("/api/register", {
      method: "POST",
      body: { username: "Fluxo", email, password: "senhaSegura1" },
    });
    const cookie = reg.setCookie.split(";")[0];

    const me = await call("/api/me", { cookie });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.email, email);

    const trade = await call("/api/trade", {
      method: "POST",
      cookie,
      body: { commodity: "cafe", side: "up", stake: 50 },
    });
    assert.equal(trade.status, 200);
    assert.ok(["win", "loss"].includes(trade.data.trade.outcome));
    assert.equal(typeof trade.data.balance, "number");

    const history = await call("/api/history", { cookie });
    assert.equal(history.status, 200);
    assert.equal(history.data.length, 1);
    assert.equal(history.data[0].stake, 50);

    const out = await call("/api/logout", { method: "POST", cookie });
    assert.equal(out.status, 200);

    const after = await call("/api/me", { cookie });
    assert.equal(after.status, 401);
  });

  maybe("trade rejeita saldo insuficiente e direção inválida", async () => {
    const email = uniqueEmail();
    const reg = await call("/api/register", {
      method: "POST",
      body: { username: "Limites", email, password: "senhaSegura1" },
    });
    const cookie = reg.setCookie.split(";")[0];

    const poor = await call("/api/trade", {
      method: "POST",
      cookie,
      body: { commodity: "cafe", side: "up", stake: 999999 },
    });
    assert.equal(poor.status, 402);

    const bad = await call("/api/trade", {
      method: "POST",
      cookie,
      body: { commodity: "cafe", side: "sideways", stake: 10 },
    });
    assert.equal(bad.status, 400);

    const zero = await call("/api/trade", {
      method: "POST",
      cookie,
      body: { commodity: "cafe", side: "up", stake: 0 },
    });
    assert.equal(zero.status, 400);
  });

  maybe("rotas protegidas exigem sessão", async () => {
    for (const [path, method] of [
      ["/api/me", "GET"],
      ["/api/history", "GET"],
      ["/api/trade", "POST"],
      ["/api/admin/users", "GET"],
    ]) {
      const { status } = await call(path, { method, body: method === "POST" ? {} : undefined });
      assert.equal(status, 401, `${path} deveria devolver 401`);
    }
  });

  maybe("admin bloqueado para utilizadores comuns", async () => {
    const email = uniqueEmail();
    const reg = await call("/api/register", {
      method: "POST",
      body: { username: "Comum", email, password: "senhaSegura1" },
    });
    const cookie = reg.setCookie.split(";")[0];
    const { status } = await call("/api/admin/users", { cookie });
    assert.equal(status, 403);
  });

  maybe("rota API desconhecida devolve 404 JSON", async () => {
    const { status, data } = await call("/api/nao-existe");
    assert.equal(status, 404);
    assert.ok(data.error);
  });
});
