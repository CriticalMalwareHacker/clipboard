# syntax=docker/dockerfile:1
# ════════════════════════════════════════════════════════
#  BASE — sets up pnpm properly inside the container
# ════════════════════════════════════════════════════════
FROM node:20-alpine AS base

# Tell pnpm where its global store lives inside the container
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# corepack manages pnpm versions natively in Node 20
RUN corepack enable

# ════════════════════════════════════════════════════════
#  STAGE 1: "builder"
#  Install ALL deps (including devDeps) and build the app.
#  --mount=type=cache keeps the pnpm store between builds
#  so reinstalls are fast. This also avoids symlink issues
#  because everything resolves inside the container's own
#  filesystem — not pointing to your host machine.
# ════════════════════════════════════════════════════════
FROM base AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

# Cache mount: pnpm store persists between Docker builds (faster rebuilds)
# --frozen-lockfile: ensures exact versions from pnpm-lock.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

# Vite bakes VITE_* env vars into the JS bundle at build time
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Build — Nitro outputs a self-contained server to .output/
RUN pnpm run build

# ════════════════════════════════════════════════════════
#  STAGE 2: "runner"
#  Minimal final image — just the compiled .output/ folder.
#  Nitro bundles everything it needs, so no node_modules
#  are required at runtime at all.
# ════════════════════════════════════════════════════════
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/.output ./output

ENV PORT=8080
EXPOSE 8080

# Cloud Run needs the server bound to 0.0.0.0
ENV NITRO_HOST=0.0.0.0

CMD ["node", "./output/server/index.mjs"]
