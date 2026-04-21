FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Enable corepack for pnpm
RUN corepack enable

# Native modules such as bcrypt may fall back to source builds in CI/local Docker
# when prebuilt binaries are unavailable.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
# Cache bust for backend copy
ARG CACHEBUST=1
COPY apps/backend ./apps/backend
# Copy other apps package.json if needed for workspace resolution, 
# but mostly we just need the root and backend context.
# Ideally we should copy only necessary package.jsons to leverage cache.

# For simplicity in this monorepo context without pruning:
RUN pnpm install --frozen-lockfile

WORKDIR /usr/src/app/apps/backend
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /usr/src/app

RUN corepack enable

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/pnpm-workspace.yaml ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/apps/backend/package.json ./apps/backend/
COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/apps/backend/src/plugins/badges/ui ./apps/backend/dist/plugins/badges/ui
COPY --from=builder /usr/src/app/apps/backend/src/plugins/home-carousel/ui ./apps/backend/dist/plugins/home-carousel/ui
COPY --from=builder /usr/src/app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=builder /usr/src/app/apps/backend/static ./apps/backend/static
COPY --from=builder /usr/src/app/apps/backend/email-templates ./apps/backend/email-templates
COPY --from=builder /usr/src/app/apps/backend/scripts ./apps/backend/scripts

# apps/backend/static contains versioned branding sources plus runtime outputs
# such as generated emails and prepared Admin UI assets.
RUN mkdir -p ./apps/backend/static/assets ./apps/backend/static/email/test-emails

WORKDIR /usr/src/app/apps/backend

EXPOSE 3001
CMD ["sh", "-c", "node scripts/reset-database.js && node dist/migrations/run-migrations.js && node dist/bootstrap/index.js"]
