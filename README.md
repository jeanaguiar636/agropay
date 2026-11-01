# AgroPay / AgroTrade VIP

Simulador educativo de negociação de commodities, construído como **Cloudflare Worker** com **D1** (SQLite na nuvem) e front-end estático servido pelo binding de assets.

> ⚠️ Projeto de demonstração: os créditos ("ZP") são fictícios. Não há pagamentos, Pix, nem negociação real.

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/commodities` | Lista de commodities com cotação simulada |
| `POST` | `/api/register` | Cria conta (`username`, `email`, `password`) |
| `POST` | `/api/login` | Inicia sessão (cookie `agropay_session`, HttpOnly) |
| `POST` | `/api/logout` | Encerra sessão |
| `GET` | `/api/me` | Utilizador autenticado + saldo |
| `POST` | `/api/trade` | Executa uma rodada (`commodity`, `side`, `stake`) |
| `GET` | `/api/history` | Últimas 100 operações |
| `POST` | `/api/settings` | Repõe o saldo de demonstração |
| `GET` | `/api/admin/users` | Lista de utilizadores *(admin)* |
| `GET` | `/api/admin/stats` | Totais do sistema *(admin)* |
| `POST` | `/api/admin/balance` | Ajusta saldo de um utilizador *(admin)* |

## Estrutura

```
public/            # front-end estático (index, app, admin, redirects)
src/index.js       # Worker: roteador, autenticação, trading, admin
migrations/        # schema D1
tests/api.test.js  # testes de integração da API
wrangler.toml
```

## Desenvolvimento local

```bash
npm install
npm run db:migrate:local   # cria as tabelas no D1 local
npm run dev                # http://127.0.0.1:8787
```

Com o servidor a correr, noutro terminal:

```bash
npm test                   # 11 testes de integração
```

## Deploy

```bash
npx wrangler d1 create agropay-db
# copie o database_id devolvido para wrangler.toml
npm run db:migrate:remote
npm run deploy
```

Depois ajuste `[vars] ADMIN_EMAILS` em `wrangler.toml` para os e-mails que devem ter acesso ao painel `/admin`.

## Segurança

- Palavras-passe com **PBKDF2-SHA256** (150 000 iterações) e salt aleatório por utilizador — nunca em texto puro.
- Sessões opacas em tabela própria, com expiração (7 dias) e rotação a cada login; cookie `HttpOnly` + `SameSite=Lax` (+ `Secure` em HTTPS).
- Rotas `/api/admin/*` exigem sessão válida **e** flag de administrador.
- Saldo é debitado no servidor com `UPDATE ... WHERE balance = ?` para evitar gasto duplo em pedidos concorrentes.

## Regras do simulador

- Saldo inicial: **1.000 ZP** · aposta de 1 a 1.000.000 ZP
- Cada rodada: 50% de chance de acertar a direção
- Vitória paga `stake × 1,7` (lucro de 70%); derrota perde o valor apostado

## Utilizador inicial

O **primeiro** utilizador registado torna-se automaticamente administrador, além dos e-mails listados em `ADMIN_EMAILS`.
