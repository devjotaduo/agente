# jotaduo · Agentes de IA

Plataforma SaaS multi-tenant para criar agentes de IA de atendimento que respondem no WhatsApp.

- **Painel admin (jotaduo):** cria agentes e o login isolado de cada cliente, gerencia templates.
- **Painel do cliente:** login próprio que só enxerga o próprio agente — configura a "voz" (personalidade) e o nome, testa num chat e conecta o WhatsApp via QR code.
- **Worker WhatsApp:** processo always-on (Baileys) que conecta os números e responde com Claude.

## Arquitetura

```
apps/web              Next.js 15 (App Router) — painel — deploy: Vercel
apps/whatsapp-worker  Node + Baileys — conexões WhatsApp — deploy: Railway/Render
packages/shared       Núcleo de IA (generateReply/Claude) + tipos — usado por web e worker
supabase/migrations   Schema + RLS (isolamento multi-tenant)
```

- **Banco/Auth:** Supabase (projeto `jotaduo-agentes` / `ygfawmsdsktoenejvxii`). Isolamento por Row Level Security.
- **LLM:** Anthropic Claude (`claude-haiku-4-5` por padrão). A "voz" do agente é o system prompt.
- **WhatsApp:** Baileys (não-oficial, QR code). A sessão é persistida no Supabase (não em disco).

## Setup local

1. **Instalar deps:** `pnpm install`
2. **Variáveis de ambiente** — preencher os segredos:
   - `apps/web/.env.local`: `SUPABASE_SERVICE_ROLE_KEY` e `ANTHROPIC_API_KEY`
   - `apps/whatsapp-worker/.env`: `SUPABASE_SERVICE_ROLE_KEY` e `ANTHROPIC_API_KEY`
   - (URL e chave anon já estão preenchidas.)
3. **Criar o admin inicial:**
   ```
   cd apps/whatsapp-worker
   ADMIN_EMAIL=voce@jotaduo.com ADMIN_PASSWORD=umaSenhaForte pnpm bootstrap:admin
   ```
4. **Rodar o painel:** `pnpm dev` → http://localhost:3000
5. **Rodar o worker (para WhatsApp):** `pnpm dev:worker`

## Fluxo de uso

1. Admin entra em `/admin` → **Novo agente**: informa e-mail do cliente, template, nome e voz. O sistema cria o login do cliente e mostra as credenciais.
2. Cliente entra em `/app` com as credenciais → ajusta a **Voz**, **testa** no chat e conecta o **WhatsApp** (QR).
3. Mensagens recebidas no número conectado são respondidas automaticamente pelo agente.

## Scripts

| Comando | O quê |
|---|---|
| `pnpm dev` | Painel web (Vercel-like) em dev |
| `pnpm dev:worker` | Worker WhatsApp em watch |
| `pnpm build` | Build de produção do painel |
| `pnpm -r typecheck` | Typecheck de todos os pacotes |
| `pnpm --filter @jotaduo/whatsapp-worker bootstrap:admin` | Cria/promove o admin |

## Banco de dados

Migrations em `supabase/migrations/` (já aplicadas no projeto via MCP). Para regerar os tipos
TypeScript após mudanças de schema, use o MCP do Supabase (`generate_typescript_types`) e atualize
`packages/shared/src/types/database.ts`.
