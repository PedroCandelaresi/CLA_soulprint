# Tienda Monorepo (Docker + Vendure + Next.js)

Este repositorio contiene una solución completa de E-commerce utilizando Vendure (Backend) y Next.js (Storefront), orquestado con Docker Compose para Debian 13.

## Arquitectura

- **apps/backend**: Servidor Vendure (NestJS). Expone Admin UI y Shop API.
- **apps/storefront**: Tienda frontend (Next.js). Consume la Shop API.
- **infra/docker**: Configuración de Docker Compose y base de datos MySQL 8.4.

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
- **MySQL 8.4**: Puerto 3306
- **Backend**: Puerto 3001
- **Storefront**: Puerto 3000

Wait for the backend to initialize (check logs with `docker compose -f infra/docker/docker-compose.yml logs -f backend`).

## Accesos

- **Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Panel**: [http://localhost:3001/admin](http://localhost:3001/admin)
    - User: `superadmin`
    - Pass: `superadmin` (ver seed o .env)
- **Shop API**: [http://localhost:3001/shop-api](http://localhost:3001/shop-api)

## Creación de Productos y Visualización

1. Ingresa al Admin Panel ([http://localhost:3001/admin](http://localhost:3001/admin)).
2. Logueate con las credenciales de superadmin.
3. Ve a **Catálogo > Productos**.
4. Crea un nuevo producto, añade nombre, descripción y una imagen.
5. Asegúrate de añadir (o crear) una variante y habilitar el producto.
6. Refresca el Storefront ([http://localhost:3000](http://localhost:3000)) y deberías ver el producto en la lista o buscando.

## Troubleshooting

- **Error de conexión DB**: Asegúrate de que el contenedor `mysql` esté healthy.
- **Backend no conecta a MySQL**: Revisa que `DB_HOST` en backend sea `mysql` (nombre del servicio en docker network).
- **Storefront no carga imágenes**: Verifica que el host del backend sea accesible desde el navegador para las imágenes, o que el servicio de assets esté bien configurado.
