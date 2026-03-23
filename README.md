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

Los workflows de `testing` siguen ese gate mínimo antes de considerar exitoso el deploy.

## Deploy automático de testing

El deploy automático de `testing` cubre solo los contenedores Docker del proyecto:

- `backend`
- `storefront`
- stack Docker completo (`mysql`, `backend`, `storefront`)

Queda fuera del deploy automático:

- Nginx host-level
- certificados
- reload manual del proxy del host

Alcance actual de los workflows:

- `Deploy Backend Testing`: cambios en `apps/backend/**`
- `Deploy Storefront Testing`: cambios en `apps/storefront/**`
- `Deploy Docker Stack Testing`: cambios globales de Docker/monorepo:
  - `infra/docker/docker-compose.yml`
  - `package.json`
  - `pnpm-lock.yaml`
  - `pnpm-workspace.yaml`
  - `turbo.json`

`infra/docker/nginx/**` no dispara deploy automático porque el proxy principal se administra manualmente en el host.

En todos los workflows de testing:

- se exige que exista `infra/docker/.env`
- `docker compose` se ejecuta siempre con `--env-file infra/docker/.env`
- backend y storefront validan solo su propio alcance
- el deploy global del stack mantiene la validación completa `pnpm validate`

## Reverse Proxy y networking

Modelo principal recomendado:
- **Nginx host-level** en el servidor host, usando [cla.nqn.net.ar.conf.example](/home/candelaresi/Proyectos/Tienda/infra/docker/nginx/cla.nqn.net.ar.conf.example) como plantilla principal.
- Docker Compose publica sólo puertos **loopback** (`127.0.0.1`) para que Nginx los consuma de forma privada.
- Entradas públicas esperadas:
  - `/` → storefront
  - `/admin` → Admin UI
  - `/shop-api` → Shop API
  - `/assets` → assets de Vendure
- Ruta de soporte necesaria para Admin UI:
  - `/admin-api`

Referencia operativa de infra:
- Ver [infra/docker/README.md](/home/candelaresi/Proyectos/Tienda/infra/docker/README.md)

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
  - para habilitar correo real se deben definir `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` y `SHOP_PUBLIC_URL`
  - si esos valores no están definidos, el backend no simula un proveedor real y no deben asumirse emails transaccionales activos
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
