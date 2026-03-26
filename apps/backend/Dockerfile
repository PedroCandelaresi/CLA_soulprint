FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Enable corepack for pnpm
RUN corepack enable

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
COPY --from=builder /usr/src/app/apps/backend/admin-ui ./apps/backend/admin-ui
COPY --from=builder /usr/src/app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /usr/src/app/apps/backend/node_modules ./apps/backend/node_modules

# The repo no longer versions apps/backend/static, but Vendure still writes
# runtime assets and dev email output under this path.
RUN mkdir -p ./apps/backend/static/assets ./apps/backend/static/email/test-emails

WORKDIR /usr/src/app/apps/backend

EXPOSE 3001
# Default command starts Vendure server
CMD ["pnpm", "start:prod"]
# To run Getnet standalone server instead, override command with:
#   docker compose run --rm getnet pnpm start:getnet:prod
