# Conectar o Instagram (publicar pôsteres pela API)

Para o agente **publicar no Instagram** você precisa de uma conta **Business/Creator**
ligada a uma **Página do Facebook**, um **app na Meta** e um **token de longa duração**.
No fim você cola **IG User ID** + **token** na aba *Instagram & pôsteres* do agente, no painel admin.

> Por que tanta coisa? A API oficial (Instagram Graph API) só publica em contas
> Business/Creator. Contas pessoais não têm acesso. E a API **busca a imagem por um URL
> público** — por isso o pôster é hospedado no nosso Storage antes de publicar.

---

## 1. Transformar o Instagram em conta Business/Creator
No app do Instagram: **Configurações → Conta → Mudar para conta profissional → Empresa**
(ou Criador). Gratuito.

## 2. Criar/ligar uma Página do Facebook
A conta do Instagram precisa estar **vinculada a uma Página do Facebook**.
No Instagram: **Editar perfil → Página → conectar/criar uma Página**.
(A Página pode ser nova e sem conteúdo; serve só para a API.)

## 3. Criar um app na Meta for Developers
1. Acesse https://developers.facebook.com/ e crie uma conta de desenvolvedor.
2. **Meus Apps → Criar app → tipo "Empresa" (Business)**.
3. No app, adicione o produto **Instagram Graph API** (ou *Instagram → API Setup with Instagram login* / *Facebook Login for Business*, conforme a tela atual da Meta).

## 4. Obter o token e o IG User ID (modo rápido com o Graph API Explorer)
Para testar e gerar o primeiro token:

1. Abra o **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. Selecione seu app no topo.
3. Em **Permissions**, adicione:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`
4. Clique em **Generate Access Token** e aceite as permissões (logue com a conta dona da Página).
5. Esse é um token **de curta duração** (≈1h). Use os passos abaixo para descobrir o IG User ID
   e depois trocar por um token de **longa duração (≈60 dias)**.

### 4.1 Descobrir o IG User ID
Com o token acima, faça as chamadas (pode ser no próprio Explorer):

```
GET /me/accounts
```
→ pegue o `id` da sua Página (PAGE_ID).

```
GET /{PAGE_ID}?fields=instagram_business_account
```
→ o `instagram_business_account.id` é o seu **IG User ID** (é esse que você cola no painel).

### 4.2 Trocar por um token de longa duração (60 dias)
```
GET https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={APP_ID}
  &client_secret={APP_SECRET}
  &fb_exchange_token={TOKEN_CURTO}
```
A resposta traz `access_token` (longo) e `expires_in` (em segundos, ~5.184.000 = 60 dias).
**Esse `access_token` longo é o que você cola no painel.**

> `APP_ID` e `APP_SECRET` ficam em **Configurações → Básico** do seu app.

## 5. Conectar no painel
No admin do agente → seção **Instagram & pôsteres** → **Conta do Instagram**:
- **IG User ID**: o id do passo 4.1
- **Token de acesso de longa duração**: o token do passo 4.2

Clicar em **Conectar Instagram** valida o token (lê o `@username`) e salva.

---

## Modo App Review (produção / publicar pela conta de qualquer cliente)
O token do Explorer funciona enquanto o app está em **modo de desenvolvimento** e a conta é
de um *tester/admin* do app. Para publicar em contas de **clientes reais**, a Meta exige:
- Colocar o app em **modo Live**.
- Passar pela **App Review** das permissões `instagram_content_publish` e `instagram_basic`
  (com vídeo demonstrando o fluxo).
- Verificação do negócio (**Business Verification**).

Para o MVP/teste com a sua própria conta, o modo de desenvolvimento já basta.

## Renovação do token
O token de 60 dias **expira**. Antes de expirar, gere outro (passo 4.2) e clique em
**Trocar token** no painel. (Possível melhoria futura: renovação automática via cron.)

## Limites e regras úteis
- Imagem precisa ser **JPEG/PNG** acessível por **URL público** (cuidado é tratado pelo Storage).
- Limite de **~25 publicações/dia** por conta via API.
- Proporção do feed entre **4:5 e 1.91:1** — o pôster padrão é **1:1 (1080×1080)**, dentro do limite.
- **Stories/Reels** usam endpoints diferentes (não cobertos por este fluxo de foto no feed).
