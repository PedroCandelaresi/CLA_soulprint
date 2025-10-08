# syntax=docker/dockerfile:1

# ---- Dependencias (maneja npm/yarn/pnpm) ----
  FROM node:20-bookworm-slim AS deps
  WORKDIR /app
  
  # Instalar dependencias del sistema requeridas por sharp
  RUN apt-get update && apt-get install -y \
      python3 \
      make \
      g++ \
      libvips-dev \
      && rm -rf /var/lib/apt/lists/*
  
  COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
  
  # Manejar cualquier gestor de paquetes
  RUN \
    if [ -f pnpm-lock.yaml ]; then npm i -g pnpm@9 && pnpm i --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm i; fi
  
  
  # ---- Build de Next ----
  FROM node:20-bookworm-slim AS builder
  WORKDIR /app
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  # Rebuild de sharp para asegurar compatibilidad
  RUN npm rebuild sharp && npm run build
  
  
  # ---- Runner liviano (standalone) ----
  FROM node:20-bookworm-slim AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV NEXT_TELEMETRY_DISABLED=1
  ENV PORT=3200
  EXPOSE 3200
  
  # Instalar solo runtime necesario
  RUN apt-get update && apt-get install -y libvips && rm -rf /var/lib/apt/lists/*
  
  # Usuario sin privilegios
  RUN addgroup --system nodejs && adduser --system --ingroup nodejs nextjs
  
  # Copiar solo lo necesario
  COPY --from=builder /app/public ./public
  COPY --from=builder /app/.next/standalone ./
  COPY --from=builder /app/.next/static ./.next/static
  
  USER nextjs
  CMD ["node", "server.js"]
  