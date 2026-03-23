# infra/docker

Modelo operativo principal de reverse proxy y networking externo:

- **Nginx host-level** en el host.
- **Docker Compose** publica upstreams sólo en `127.0.0.1`.
- El archivo principal de referencia es [cla.nqn.net.ar.conf.example](/home/candelaresi/Proyectos/Tienda/infra/docker/nginx/cla.nqn.net.ar.conf.example).
- [default.conf](/home/candelaresi/Proyectos/Tienda/infra/docker/nginx/default.conf) queda sólo como referencia secundaria para un posible Nginx dentro de la red Docker. No es el camino recomendado mientras `docker-compose.yml` no defina un servicio `nginx`.

## Upstreams loopback publicados por Compose

- `127.0.0.1:4000` → `storefront:3000`
- `127.0.0.1:4002` → `backend:3001`
- `127.0.0.1:4001` → acceso directo de debug a `shop-api` sobre el mismo backend

## Entradas públicas esperadas

- `/` → `http://127.0.0.1:4000`
- `/admin` → `http://127.0.0.1:4002/admin`
- `/admin-api` → `http://127.0.0.1:4002/admin-api`
- `/shop-api` → `http://127.0.0.1:4002/shop-api`
- `/assets` → `http://127.0.0.1:4002/assets`

## Flujo recomendado

1. Levantar Compose:

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

2. Instalar la configuración Nginx host-level basada en:

```text
infra/docker/nginx/cla.nqn.net.ar.conf.example
```

3. Publicar sólo el dominio por Nginx y mantener `4000/4001/4002` como loopback/debug.

## Nota sobre el camino secundario

- [default.conf](/home/candelaresi/Proyectos/Tienda/infra/docker/nginx/default.conf) conserva una variante para Nginx dentro de la red Docker usando `storefront` y `backend` como upstreams internos.
- Esa variante es sólo una **referencia secundaria**. Si se quisiera usar de forma real, habría que agregar un servicio `nginx` a `docker-compose.yml`.
