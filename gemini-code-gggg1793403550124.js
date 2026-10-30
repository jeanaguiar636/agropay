export async function onRequestGet(context) {
    try {
        // Busca todos os usuários cadastrados no Cloudflare D1
        const { results: users } = await context.env.DB.prepare("SELECT * FROM users").all();
        
        // Calcula o total em circulação e lucro da casa
        const totalZPay = users.reduce((acc, u) => acc + u.balance, 0);

        return new Response(JSON.stringify({ success: true, users, totalZPay }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}

// Endpoint para dar ou remover créditos manualmente pelo Admin
export async function onRequestPost(context) {
    try {
        const { email, amount } = await context.request.json();
        
        await context.env.DB.prepare(
            "UPDATE users SET balance = balance + ? WHERE email = ?"
        ).bind(amount, email).run();

        return new Response(JSON.stringify({ success: true, message: "Créditos atualizados com sucesso!" }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
}