export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Garantir que a tabela D1 existe
            await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT,
                    email TEXT UNIQUE,
                    password TEXT,
                    balance REAL DEFAULT 100.0
                )
            `).run();

            // API DE REGISTO
            if (path === "/api/register" && request.method === "POST") {
                const { username, email, password } = await request.json();
                
                if (!username || !email || !password) {
                    return new Response(JSON.stringify({ success: false, error: "Preencha todos os campos." }), {
                        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                // Verificar se o e-mail já existe
                const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
                if (existing) {
                    return new Response(JSON.stringify({ success: false, error: "Este e-mail já está registado. Tente fazer login." }), {
                        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }

                try {
                    await env.DB.prepare(
                        "INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, ?)"
                    ).bind(username, email, password, 100.0).run();

                    return new Response(JSON.stringify({ success: true }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } catch (err) {
                    return new Response(JSON.stringify({ success: false, error: "Erro ao criar conta na nuvem." }), {
                        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            // API DE LOGIN
            if (path === "/api/login" && request.method === "POST") {
                const { email, password } = await request.json();

                const user = await env.DB.prepare(
                    "SELECT * FROM users WHERE email = ? AND password = ?"
                ).bind(email, password).first();

                if (user) {
                    return new Response(JSON.stringify({ 
                        success: true, 
                        user: { id: user.id, username: user.username, email: user.email, balance: user.balance } 
                    }), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                } else {
                    return new Response(JSON.stringify({ success: false, error: "E-mail ou palavra-passe incorretos." }), {
                        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
                    });
                }
            }

            return env.ASSETS.fetch(request);

        } catch (err) {
            return new Response(JSON.stringify({ success: false, error: err.message }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
    }
};
```eof

### O que fazer:
1. Atualize o ficheiro **`_worker.js`** no GitHub com o código acima e faça o *commit*.
2. Se quiser testar com um e-mail novo, basta criar uma conta com um e-mail inédito (ex: `teste2026@agro.com`) e o registo passará instantaneamente para a base de dados D1, permitindo-lhe fazer login de imediato!
