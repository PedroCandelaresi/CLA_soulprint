# apps/backend

Esta carpeta contiene una app Vendure sobre NestJS.

No existe en este repositorio un backend Nest modular separado para lógica de dominio propia. Toda la app backend actual es la instancia de Vendure.

## Estructura

```text
src/
├─ bootstrap/   # Arranque del servidor Vendure
├─ config/      # Configuración principal de Vendure
├─ migrations/  # Scripts operativos y migraciones versionadas
└─ seed/        # Seed / bootstrap de datos iniciales
```

## Entrypoints

- `src/bootstrap/index.ts`: inicia el servidor Vendure
- `src/config/vendure-config.ts`: define la configuración principal
- `src/migrations/`: contiene los scripts para generar/aplicar/revertir migraciones
- `src/seed/populate.ts`: aplica seed mínimo de canal, impuestos y producto demo

## Comandos

```bash
pnpm --dir apps/backend start
pnpm --dir apps/backend dev
pnpm --dir apps/backend build
pnpm --dir apps/backend populate
pnpm --dir apps/backend migration:generate --name baseline
pnpm --dir apps/backend migration:run
pnpm --dir apps/backend migration:revert
```

## Esquema y migraciones

- `DB_SYNCHRONIZE=true` queda reservado para desarrollo local o bases efimeras.
- En `APP_ENV=testing` y `APP_ENV=production`, el backend aborta si `DB_SYNCHRONIZE=true`.
- Las migraciones versionadas se guardan en `src/migrations/history/`.
- Antes del primer deploy persistente sobre una base limpia, hay que generar y commitear una migracion baseline.
- En entornos persistentes, el flujo operativo esperado es:

```bash
pnpm --dir apps/backend build
pnpm --dir apps/backend migration:run:prod
pnpm --dir apps/backend start:prod
```

## Seguridad operativa mínima

- `dummyPaymentHandler` queda limitado a `APP_ENV=local/dev`. Producción requiere un handler o plugin de pagos real antes de habilitar checkout.
- `SUPERADMIN_USERNAME` y `SUPERADMIN_PASSWORD` son obligatorios fuera de `local/dev` y no pueden quedar en `superadmin/superadmin`.
- Cookies:
  - `COOKIE_SECRET`: obligatorio fuera de `local/dev`
  - `COOKIE_DOMAIN`: obligatorio en `production`
  - `COOKIE_SAME_SITE`: recomendado `lax`
  - `COOKIE_SECURE=true` y `COOKIE_SECURE_PROXY=true` en testing/production detrás de TLS
- `CORS_ORIGINS` debe ser explícito y sin `*`. En `production`, usar sólo orígenes `https://`.

## Correo

- `APP_ENV=local/dev`: el plugin usa transporte `file`, templates por defecto de Vendure y `/mailbox`.
- `APP_ENV=testing/production`: el plugin sólo activa SMTP real si están definidos `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `SHOP_PUBLIC_URL`.
- Si esas variables no están definidas, el backend arranca sin correo transaccional activo. Eso es deliberado: no se simula un proveedor productivo.
