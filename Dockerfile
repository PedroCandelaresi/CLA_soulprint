# syntax=docker/dockerfile:1

# ---- Dependencias (maneja npm/yarn/pnpm) ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f pnpm-lock.yaml ]; then npm i -g pnpm@9 && pnpm i --frozen-lockfile; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  else npm i; fi

# ---- Build de Next ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Instalar dependencias para sharp en Alpine
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    build-base \
    python3
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Reinstalar sharp para el entorno Alpine
RUN npm rebuild sharp
# Si usás NEXT_PUBLIC_* o variables de build, cargalas por .env.production
RUN npm run build

# ---- Runner liviano (standalone) ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3200
EXPOSE 3200

# Instalar vips para sharp en runtime
RUN apk add --no-cache vips-dev

# Usuario sin privilegios
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copiamos SOLO lo necesario para el modo standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs
CMD ["node", "server.js"]
