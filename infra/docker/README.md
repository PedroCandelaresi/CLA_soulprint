# infra/docker

Modelo operativo principal de reverse proxy y networking externo:

- **Nginx host-level** en el host.
- **Docker Compose** publica upstreams sólo en `127.0.0.1`.
- El archivo principal de referencia es [demo.example.com.conf.example](/home/candelaresi/Proyectos/demo2/infra/docker/nginx/demo.example.com.conf.example).
- [default.conf](/home/candelaresi/Proyectos/demo2/infra/docker/nginx/default.conf) queda sólo como referencia secundaria para un posible Nginx dentro de la red Docker. No es el camino recomendado mientras `docker-compose.yml` no defina un servicio `nginx`.

## Upstreams loopback publicados por Compose

- `127.0.0.1:3000` → `storefront:3000`
- `127.0.0.1:3002` → `backend:3001`
- `127.0.0.1:3001` → acceso loopback de debug a `shop-api` sobre el mismo backend

## Entradas públicas esperadas

- `/` → `http://127.0.0.1:3000`
- `/api/shop` → `http://127.0.0.1:3000/api/shop`
- `/admin` → `http://127.0.0.1:3002/admin`
- `/admin-api` → `http://127.0.0.1:3002/admin-api`
- `/assets` → `http://127.0.0.1:3002/assets`

## Flujo recomendado

1. Levantar Compose:

```bash
docker compose -f infra/docker/docker-compose.yml up -d --build
```

2. Instalar la configuración Nginx host-level basada en:

```text
infra/docker/nginx/demo.example.com.conf.example
```

3. Publicar sólo el dominio por Nginx y mantener `3000/3001/3002` como loopback/debug.
4. Mantener `/shop-api` bloqueado en el vhost público para que el navegador use sólo `/api/shop`.

## Nota sobre el camino secundario

- [default.conf](/home/candelaresi/Proyectos/demo2/infra/docker/nginx/default.conf) conserva una variante para Nginx dentro de la red Docker usando `storefront` y `backend` como upstreams internos.
- Esa variante es sólo una **referencia secundaria**. Si se quisiera usar de forma real, habría que agregar un servicio `nginx` a `docker-compose.yml`.
