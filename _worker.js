export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Garante que a tabela existe na base de dados D1
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT,
          email TEXT UNIQUE,
          password TEXT,
          balance INTEGER DEFAULT 100,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // Rota de Registo
      if (path === "/api/register" && request.method === "POST") {
        const { username, email, password } = await request.json();
        if (!username || !email || !password) {
          return new Response(JSON.stringify({ error: "Preencha todos os campos." }), { status: 400, headers: corsHeaders });
        }

        const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
        if (existing) {
          return new Response(JSON.stringify({ error: "Este e-mail já está registado." }), { status: 400, headers: corsHeaders });
        }

        await env.DB.prepare(
          "INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, 100)"
        ).bind(username, email, password).run();

        return new Response(JSON.stringify({ success: true, message: "Registo efetuado com sucesso!" }), { headers: corsHeaders });
      }

      // Rota de Login
      if (path === "/api/login" && request.method === "POST") {
        const { email, password } = await request.json();
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password = ?").bind(email, password).first();
        
        if (!user) {
          return new Response(JSON.stringify({ error: "E-mail ou palavra-passe incorretos." }), { status: 401, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          user: { id: user.id, username: user.username, email: user.email, balance: user.balance }
        }), { headers: corsHeaders });
      }

      // Rota de Administração (Lista e atualiza utilizadores na D1)
      if (path === "/api/admin") {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT id, username, email, balance, created_at FROM users").all();
          return new Response(JSON.stringify(results || []), { headers: corsHeaders });
        }
        if (request.method === "POST") {
          const { userId, newBalance } = await request.json();
          await env.DB.prepare("UPDATE users SET balance = ? WHERE id = ?").bind(newBalance, userId).run();
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }
      }

      // Serve os ficheiros estáticos HTML se não for uma rota de API
      return env.ASSETS.fetch(request);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
