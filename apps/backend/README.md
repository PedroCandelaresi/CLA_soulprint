# apps/backend

Esta carpeta contiene una app Vendure sobre NestJS.

No existe en este repositorio un backend Nest modular separado para lógica de dominio propia. Toda la app backend actual es la instancia de Vendure.

## Estructura

```text
src/
├─ admin-ui/    # scripts para preparar/copiar el Admin UI customizado
├─ bootstrap/   # Arranque del servidor Vendure
├─ config/      # Configuración principal de Vendure
├─ migrations/  # Scripts operativos y migraciones versionadas
└─ seed/        # Seed / bootstrap de datos iniciales
```

## Entrypoints

- `src/bootstrap/index.ts`: inicia el servidor Vendure
- `src/admin-ui/`: prepara el bundle estático del Admin UI con branding CLA Soulprint
- `src/config/vendure-config.ts`: define la configuración principal
- `src/migrations/`: contiene los scripts para generar/aplicar/revertir migraciones
- `src/seed/populate.ts`: aplica seed mínimo de canal, impuestos y producto demo

## Comandos

```bash
pnpm --dir apps/backend start
pnpm --dir apps/backend dev
pnpm --dir apps/backend build
pnpm --dir apps/backend build:admin-ui
pnpm --dir apps/backend populate
pnpm --dir apps/backend migration:generate --name baseline
pnpm --dir apps/backend migration:run
pnpm --dir apps/backend migration:revert
```

## Admin UI CLA Soulprint

- El código fuente del branding del Admin vive en `admin-ui-src/`.
- `pnpm --dir apps/backend build` copia el Admin UI precompilado oficial de Vendure a `apps/backend/admin-ui/` y le aplica:
  - logos y favicon CLA
  - hero custom del login
  - estilos globales de marca
  - textos de login ajustados
- Ese `apps/backend/admin-ui/` es un artefacto generado y no se commitea.
- El login del Admin quedó alineado con `tokenMethod: bearer` en el Admin UI para evitar que el login responda OK pero no persista sesión.

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
- `APP_ENV=testing/production`: el backend ahora usa un fallback SMTP temporal hardcodeado si faltan `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` o `SMTP_FROM`.
- `SHOP_PUBLIC_URL` sigue siendo obligatorio fuera de `local/dev`, porque las URLs transaccionales se generan desde ahí.
- Ese fallback es solo bootstrap para que el servicio arranque en VPS. Reemplázalo por variables reales antes de depender de envíos de correo.
