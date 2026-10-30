export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return new Response(JSON.stringify({ error: "Preencha todos os campos obrigatórios." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (existing) {
      return new Response(JSON.stringify({ error: "Este e-mail já está registado." }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }

    await env.DB.prepare(
      "INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, 100)"
    ).bind(username, email, password).run();

    return new Response(JSON.stringify({ success: true, message: "Registo efetuado com sucesso!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
