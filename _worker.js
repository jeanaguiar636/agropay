export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers para permitir pedidos do frontend
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
      // Rota de Registo
      if (path === "/api/register" && request.method === "POST") {
        const body = await request.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
          return new Response(JSON.stringify({ error: "Preencha todos os campos obrigatórios." }), { status: 400, headers: corsHeaders });
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

      // Rota de Administração (Listar e Atualizar Saldos ZPay)
      if (path === "/api/admin") {
        if (request.method === "GET") {
          const { results } = await env.DB.prepare("SELECT id, username, email, balance, avatar_url, created_at FROM users").all();
          return new Response(JSON.stringify(results), { headers: corsHeaders });
        }

        if (request.method === "POST") {
          const { userId, newBalance } = await request.json();
          await env.DB.prepare("UPDATE users SET balance = ? WHERE id = ?").bind(newBalance, userId).run();
          return new Response(JSON.stringify({ success: true, message: "Saldo ZPay atualizado com sucesso!" }), { headers: corsHeaders });
        }
      }

      // Se não for rota de API, deixa o Cloudflare servir os ficheiros estáticos (HTML)
      return env.ASSETS.fetch(request);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
  }
};
