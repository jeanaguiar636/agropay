export async function onRequestPost(context) {
    try {
        const formData = await context.request.formData();
        const username = formData.get('username');
        const email = formData.get('email');
        const password = formData.get('password');
        const avatarFile = formData.get('avatar');

        let avatarUrl = '';

        // Se o usuário enviou foto de perfil, salvamos no Cloudflare R2
        if (avatarFile && avatarFile.size > 0) {
            const fileName = `avatars/${Date.now()}-${avatarFile.name}`;
            await context.env.BUCKET.put(fileName, avatarFile.stream(), {
                httpMetadata: { contentType: avatarFile.type }
            });
            avatarUrl = `https://seu-dominio-ou-r2.r2.dev/${fileName}`; // ou link direto do bucket
        }

        // Insere o usuário no Banco D1 com 100 ZPay de bônus inicial
        const stmt = context.env.DB.prepare(
            `INSERT INTO users (username, email, password, balance, avatar_url) VALUES (?, ?, ?, 100, ?)`
        );
        await stmt.bind(username, email, password, avatarUrl).run();

        return new Response(JSON.stringify({ success: true, message: "Conta criada com sucesso!" }), {
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}