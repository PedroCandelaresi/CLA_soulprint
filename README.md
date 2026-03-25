# Tienda Monorepo (Docker + Vendure + Next.js)

Este repositorio contiene una solución completa de E-commerce utilizando Vendure (Backend) y Next.js (Storefront), orquestado con Docker Compose para Debian 13.

## Arquitectura

- **apps/backend**: Aplicación Vendure montada sobre NestJS. Expone Admin UI, Admin API y Shop API.
  No existe en este repo un backend Nest modular separado para dominio propio.
- **apps/storefront**: Tienda frontend (Next.js). Consume la Shop API.
- **infra/docker**: Configuración de Docker Compose y base de datos MySQL 8.4.

El workspace pnpm actual contiene solo `apps/backend` y `apps/storefront`.
No hay por ahora paquetes compartidos versionados en `packages/`.

## Requisitos

- Linux (Debian 13 recomendado) o compatible.
- Docker Engine & Docker Compose.
- pnpm (opcional para desarrollo local fuera de docker, pero recomendado).

## Cómo levantar el proyecto

### 1. Variables de entorno

Copia los archivos de ejemplo:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/storefront/.env.example apps/storefront/.env
# La configuración de docker ya tiene valores por defecto en el docker-compose.yml o usa un archivo .env si se prefiere
```

### 2. Levantar con Docker Compose

Desde la raíz del proyecto (o desde `infra/docker` si prefieres, pero el compose apunta al contexto raíz):

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

Esto levantará:
- **MySQL 8.4**: Puerto 4406
- **Storefront**: Puerto 4000
- **Backend (Shop API)**: Puerto 4001
- **Backend (Admin UI / Admin API / Health)**: Puerto 4002

Wait for the backend to initialize (check logs with `docker compose -f infra/docker/docker-compose.yml logs -f backend`).

## Validación mínima antes de deploy

Flujo mínimo recomendado antes de reiniciar servicios en testing/production:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm build
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml config
```

Smoke tests mínimos según el alcance del deploy:

- backend:

```bash
curl -fsS http://127.0.0.1:4002/health
```

- storefront:

```bash
curl -fsSI http://127.0.0.1:4000
```

- infra / stack completo:

```bash
curl -fsS http://127.0.0.1:4002/health
curl -fsSI http://127.0.0.1:4000
```

Ese gate mínimo sigue siendo recomendable para validación manual. El workflow de `testing` del VPS, en cambio, ejecuta el deploy de forma Docker-only.

## Deploy automático de testing

Rama única de deploy de testing:

- `develop` es la única rama que dispara deploy automático hacia `testing`.
- `main` queda como rama estable y no despliega a `testing`.
- Las ramas `feature/*` no disparan deploy automático.

El deploy automático de `testing` cubre solo los contenedores Docker del proyecto:

- `backend`
- `storefront`
- stack Docker completo (`mysql`, `backend`, `storefront`)

Queda fuera del deploy automático:

- Nginx host-level
- certificados
- reload manual del proxy del host

Alcance actual del workflow `Deploy Testing`:

- sincroniza `/opt/cla_soulprint-testing` al SHA exacto del evento con:
  - `git fetch --prune --tags origin`
  - `git checkout -B develop origin/develop`
  - `git reset --hard $GITHUB_SHA`
  - `git clean -ffd`
- decide una sola acción por push:
  - `backend`: cambios solo en `apps/backend/**`
  - `storefront`: cambios solo en `apps/storefront/**`
  - `stack`: cambios en ambos apps a la vez, o cambios globales en:
    - `infra/docker/docker-compose.yml`
    - `package.json`
    - `pnpm-lock.yaml`
    - `pnpm-workspace.yaml`
    - `turbo.json`
  - `none`: cambios solo en docs, ejemplos manuales de `infra/docker/nginx/**` o archivos de CI
- exige que exista `infra/docker/.env`
- no requiere `pnpm` instalado en el host del runner
- ejecuta siempre `docker compose` con `--env-file infra/docker/.env`
- construye backend/storefront dentro de Docker usando los `Dockerfile` del repo
- no usa `git pull`
- no toca Nginx host-level
- evita carreras entre workflows porque el deploy de `testing` quedó unificado en un solo workflow

## Reverse Proxy y networking

Modelo principal recomendado:
- **Nginx host-level** en el servidor host, usando [cla.nqn.net.ar.conf.example](/home/candelaresi/Proyectos/CLA_soulprint/infra/docker/nginx/cla.nqn.net.ar.conf.example) como plantilla principal.
- Docker Compose publica sólo puertos **loopback** (`127.0.0.1`) para que Nginx los consuma de forma privada.
- Entradas públicas esperadas:
  - `/` → storefront
  - `/admin` → Admin UI
  - `/shop-api` → Shop API
  - `/assets` → assets de Vendure
- Ruta de soporte necesaria para Admin UI:
  - `/admin-api`

Referencia operativa de infra:
- Ver [infra/docker/README.md](/home/candelaresi/Proyectos/CLA_soulprint/infra/docker/README.md)

## Admin UI de Vendure

- El panel de administración se sirve en `/admin` como un bundle estático customizado para CLA Soulprint.
- La causa raíz del login silencioso era una desalineación entre el Admin UI y el backend: el backend estaba devolviendo `vendure-auth-token`, pero el Admin estaba configurado como si persistiera sesión por cookie. El Admin quedó forzado a `tokenMethod: bearer` con `authTokenHeaderKey: vendure-auth-token`.
- El branding del Admin vive en `apps/backend/admin-ui-src/`.
- El bundle generado del Admin vive en `apps/backend/admin-ui/` y no se versiona.
- `pnpm --dir apps/backend build` ahora recompone también el Admin custom antes de empaquetar Docker.

## Accesos locales / debug

- **Storefront**: [http://localhost:4000](http://localhost:4000)
- **Admin Panel**: [http://localhost:4002/admin](http://localhost:4002/admin)
    - Credenciales: definidas por `SUPERADMIN_USERNAME` y `SUPERADMIN_PASSWORD`
- **Shop API**: [http://localhost:4001/shop-api](http://localhost:4001/shop-api)
- **Assets**: [http://localhost:4002/assets/](http://localhost:4002/assets/)

Estos puertos no son el camino público principal de despliegue. Son upstreams loopback para el Nginx host-level recomendado y accesos útiles para testing/debug local.

## Estructura del backend Vendure

La app en `apps/backend` está organizada como una instancia de Vendure:

```text
apps/backend/src/
├─ bootstrap/   # Arranque del servidor Vendure
├─ config/      # Configuración principal de Vendure
├─ migrations/  # Scripts operativos y migraciones versionadas
└─ seed/        # Seed / bootstrap de datos iniciales
```

## Migraciones

- `DB_SYNCHRONIZE` debe usarse solo en desarrollo local o bases efimeras.
- En `APP_ENV=testing` y `APP_ENV=production`, el backend aborta si `DB_SYNCHRONIZE=true`.
- Las migraciones versionadas viven en `apps/backend/src/migrations/history/`.
- Si todavia no existe una migracion baseline commiteada, hay que generarla y versionarla antes del primer deploy persistente sobre una base limpia.

Comandos operativos:

```bash
pnpm --dir apps/backend migration:generate --name baseline
pnpm --dir apps/backend migration:run
pnpm --dir apps/backend migration:run:prod
pnpm --dir apps/backend migration:revert
```

## Notas de seguridad

- En `APP_ENV=testing` o `APP_ENV=production`, `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`, `COOKIE_SECRET` y `CORS_ORIGINS` deben estar definidos.
- `/mailbox` debe quedar disponible solo en `APP_ENV=local` o `APP_ENV=dev`.
- En `APP_ENV=production`, `COOKIE_DOMAIN` debe estar definido y `COOKIE_SECURE=true`.
- `COOKIE_SAME_SITE` debe ser explícito. El default recomendado para este repo es `lax`.
- `CORS_ORIGINS` debe ser una lista explícita; no se permiten wildcards y en producción deben ser orígenes `https://`.

## Sesiones, correo y pagos

- `dummyPaymentHandler` existe solo para `APP_ENV=local/dev`. Este repo no tiene todavía un proveedor de pago real configurado para producción.
- Cookies de sesión del backend:
  - `COOKIE_SECRET`: obligatorio fuera de `local/dev`
  - `COOKIE_DOMAIN`: obligatorio en `production`
  - `COOKIE_SAME_SITE`: recomendado `lax`, salvo que se diseñe un flujo cross-site explícito
  - `COOKIE_SECURE=true` y `COOKIE_SECURE_PROXY=true` en despliegues detrás de TLS/reverse proxy
- Correo:
  - `local/dev`: `EmailPlugin` usa transporte `file` y expone `/mailbox`
  - `testing/production`: `/mailbox` no se expone
  - en `testing/production`, si faltan `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` o `SMTP_FROM`, el backend usa un fallback SMTP temporal hardcodeado para poder arrancar
  - `SHOP_PUBLIC_URL` sigue siendo obligatorio fuera de `local/dev`
  - ese fallback es solo bootstrap y debe reemplazarse por variables reales antes de depender de emails transaccionales
- Bootstrap de superadmin:
  - no usar `superadmin/superadmin` fuera de `local/dev`
  - definir credenciales fuertes y temporales para el primer acceso
  - después del bootstrap inicial, rotar credenciales y almacenarlas fuera del repositorio

## Creación de Productos y Visualización

1. Ingresa al Admin Panel ([http://localhost:4002/admin](http://localhost:4002/admin)).
2. Logueate con las credenciales de superadmin.
3. Ve a **Catálogo > Productos**.
4. Crea un nuevo producto, añade nombre, descripción y una imagen.
5. Asegúrate de añadir (o crear) una variante y habilitar el producto.
6. Refresca el Storefront ([http://localhost:4000](http://localhost:4000)) y deberías ver el producto en la lista o buscando.

## Troubleshooting

- **Error de conexión DB**: Asegúrate de que el contenedor `mysql` esté healthy.
- **Backend no conecta a MySQL**: Revisa que `DB_HOST` en backend sea `mysql` (nombre del servicio en docker network).
- **Storefront no carga imágenes**: Verifica que el host del backend sea accesible desde el navegador para las imágenes, o que el servicio de assets esté bien configurado.
