export async function onRequestGet(context) {
  try {
    const { env } = context;
    const { results } = await env.DB.prepare("SELECT id, username, email, balance, avatar_url, created_at FROM users").all();
    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { userId, newBalance } = await request.json();
    await env.DB.prepare("UPDATE users SET balance = ? WHERE id = ?").bind(newBalance, userId).run();
    return new Response(JSON.stringify({ success: true, message: "Saldo ZPay atualizado com sucesso!" }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }
}
