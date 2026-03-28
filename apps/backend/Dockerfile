# syntax=docker/dockerfile:1.7

FROM node:20-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

FROM base AS build

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN --mount=type=cache,id=backend-pnpm-store,target=/pnpm/store \
    pnpm fetch --filter backend...

RUN --mount=type=cache,id=backend-pnpm-store,target=/pnpm/store \
    pnpm install --filter backend... --frozen-lockfile --offline

COPY apps/backend ./apps/backend

WORKDIR /usr/src/app/apps/backend
RUN pnpm build

FROM build AS deploy

WORKDIR /usr/src/app

RUN --mount=type=cache,id=backend-pnpm-store,target=/pnpm/store \
    pnpm --filter backend deploy --prod /prod/backend \
    && rm -rf /prod/backend/src /prod/backend/admin-ui-src /prod/backend/.turbo

FROM base AS runner

ENV NODE_ENV=production

WORKDIR /usr/src/app/apps/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deploy /prod/backend ./

# The repo no longer versions apps/backend/static, but Vendure still writes
# runtime assets and dev email output under this path.
RUN mkdir -p ./static/assets ./static/email/test-emails

EXPOSE 3001

CMD ["pnpm", "start:prod"]
