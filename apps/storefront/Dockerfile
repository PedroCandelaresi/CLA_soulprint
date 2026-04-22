
# Stage 1: Base
FROM node:20-alpine AS base

# Stage 2: Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_VENDURE_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_REQUIRE_CUSTOMER_VERIFICATION
ARG NEXT_PUBLIC_BANK_ACCOUNT_NAME
ARG NEXT_PUBLIC_BANK_CUIT
ARG NEXT_PUBLIC_BANK_CBU
ARG NEXT_PUBLIC_BANK_ALIAS
ENV NEXT_PUBLIC_VENDURE_API_URL=$NEXT_PUBLIC_VENDURE_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_REQUIRE_CUSTOMER_VERIFICATION=$NEXT_PUBLIC_REQUIRE_CUSTOMER_VERIFICATION
ENV NEXT_PUBLIC_BANK_ACCOUNT_NAME=$NEXT_PUBLIC_BANK_ACCOUNT_NAME
ENV NEXT_PUBLIC_BANK_CUIT=$NEXT_PUBLIC_BANK_CUIT
ENV NEXT_PUBLIC_BANK_CBU=$NEXT_PUBLIC_BANK_CBU
ENV NEXT_PUBLIC_BANK_ALIAS=$NEXT_PUBLIC_BANK_ALIAS
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build time
ENV NEXT_TELEMETRY_DISABLED=1

RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# Stage 4: Runner
FROM base AS runner
WORKDIR /app
ARG NEXT_PUBLIC_BANK_ACCOUNT_NAME
ARG NEXT_PUBLIC_BANK_CUIT
ARG NEXT_PUBLIC_BANK_CBU
ARG NEXT_PUBLIC_BANK_ALIAS
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NEXT_PUBLIC_BANK_ACCOUNT_NAME=$NEXT_PUBLIC_BANK_ACCOUNT_NAME
ENV NEXT_PUBLIC_BANK_CUIT=$NEXT_PUBLIC_BANK_CUIT
ENV NEXT_PUBLIC_BANK_CBU=$NEXT_PUBLIC_BANK_CBU
ENV NEXT_PUBLIC_BANK_ALIAS=$NEXT_PUBLIC_BANK_ALIAS
# set hostname to localhost
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
