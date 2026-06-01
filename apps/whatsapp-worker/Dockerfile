# Worker WhatsApp (Baileys) — imagem para Railway/Render.
# IMPORTANTE: o build context deve ser a RAIZ do repositório (monorepo pnpm).
FROM node:22-slim

# git (libsignal vem via git), e toolchain p/ módulos nativos (sharp).
RUN apt-get update && apt-get install -y --no-install-recommends \
      git python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Baileys puxa libsignal via repositório git; força HTTPS (sem chave SSH no build).
RUN git config --global url."https://github.com/".insteadOf "git+ssh://git@github.com/" \
 && git config --global url."https://github.com/".insteadOf "git@github.com:"

RUN corepack enable && corepack prepare pnpm@11.0.9 --activate
WORKDIR /app

# Manifestos primeiro (camada de cache do Docker).
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY apps/whatsapp-worker/package.json apps/whatsapp-worker/

# Aprova os builds nativos no ambiente Docker (pnpm padrão lê onlyBuiltDependencies).
RUN printf '\nonlyBuiltDependencies:\n  - esbuild\n  - sharp\n  - protobufjs\n' >> pnpm-workspace.yaml

# Instala apenas o worker + shared (ignora web e deps de imagem/instagram).
RUN pnpm install --filter "@jotaduo/whatsapp-worker..." --frozen-lockfile

# Código-fonte.
COPY packages/shared packages/shared
COPY apps/whatsapp-worker apps/whatsapp-worker

ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@jotaduo/whatsapp-worker", "start"]
