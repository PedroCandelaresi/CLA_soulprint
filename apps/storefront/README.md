# Tienda - Storefront

Storefront moderno construido con Next.js 16, MUI v7 y TypeScript. Diseñado para ser liviano y rápido.

## Estructura

- `apps/storefront`: Aplicación Next.js
- `src/components`: Componentes reutilizables (sin estructura profunda)
- `src/lib/vendure.ts`: Cliente para conectar con el backend

## Requisitos

- Node.js 20+
- pnpm
- Docker (para el backend)

## Iniciar Desarrollo

1.  Asegurarse que el backend esté corriendo (`docker compose up backend`).
2.  Instalar dependencias:
    ```bash
    pnpm install
    ```
3.  Configurar variables de entorno:
    ```bash
    cp .env.example .env
    ```
4.  Correr servidor de desarrollo:
    ```bash
    cd apps/storefront
    pnpm dev
    ```
    El sitio estará disponible en `http://localhost:3000`.

## Integración con Backend

El storefront se conecta a Vendure vía GraphQL.
- Server-side calls usan `VENDURE_INTERNAL_API_URL` (http://backend:3001/shop-api)
- Client-side calls usan `NEXT_PUBLIC_VENDURE_API_URL` (`/api/shop`, mismo origen vía el proxy Next)
