# 🔓 Admin Testing Mode — Docker & GitHub Actions

## 📋 Resumen

Sistema completo para acceder al Admin UI de Vendure **sin login** en ambientes de testing (Docker, GitHub Actions, CI/CD).

### Cómo Funciona

1. **Build Time:** Variables de entorno `ADMIN_TESTING_MODE`, `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD` se procesan durante `prepare-admin-ui`
2. **Inyección:** Se genera `auto-login-config.json` + se inyecta config en `index.html`
3. **Runtime:** Script `auto-login.js` carga la config y hace login automático
4. **Token:** Se guarda en localStorage y se mantiene la sesión

---

## 🐳 Docker

### Opción 1: `apps/backend/Dockerfile`

Este repositorio usa un único Dockerfile para el backend en `apps/backend/Dockerfile`.

```bash
# Build
ADMIN_TESTING_MODE=true \
SUPERADMIN_USERNAME=admin \
SUPERADMIN_PASSWORD=test123 \
docker build -f apps/backend/Dockerfile -t cla-backend-test .

# Run
docker run -p 3001:3001 -p 3002:3002 \
  -e DB_HOST=db \
  -e ADMIN_TESTING_MODE=true \
  -e SUPERADMIN_USERNAME=admin \
  -e SUPERADMIN_PASSWORD=test123 \
  cla-backend-test
```

**Resultado:** Admin accesible en `http://localhost:3002/admin` sin login

### Opción 2: `infra/docker/docker-compose.yml`

```bash
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d --build
```

**Incluye:**
- Backend con auto-login si `ADMIN_TESTING_MODE=true`
- MySQL
- Storefront opcional

**Acceso:**
```
Admin UI:  http://localhost:3002/admin
API:       http://localhost:3001
Usuario:   admin
Password:  test123
```

### Opción 3: Dockerfile normal + variables de entorno

```dockerfile
FROM node:20-alpine

ENV ADMIN_TESTING_MODE=true
ENV SUPERADMIN_USERNAME=admin
ENV SUPERADMIN_PASSWORD=test123

# ... rest of Dockerfile
```

O en docker-compose regular:

```yaml
services:
  backend:
    environment:
      - ADMIN_TESTING_MODE=true
      - SUPERADMIN_USERNAME=admin
      - SUPERADMIN_PASSWORD=test123
```

---

## 🚀 GitHub Actions

### Workflow Completo

Ver `.github/workflows/deploy-testing.yml`

**Flujo:**
1. Build backend con `ADMIN_TESTING_MODE=true`
2. Tests en runner
3. Deploy a ambiente de testing

### Usar en tu workflow

```yaml
name: Test

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with testing mode
        uses: docker/build-push-action@v5
        with:
          file: ./apps/backend/Dockerfile
          push: true
          tags: ${{ github.repository }}:test
          build-args: |
            ADMIN_TESTING_MODE=true
            SUPERADMIN_USERNAME=${{ secrets.TESTING_ADMIN_USER || 'admin' }}
            SUPERADMIN_PASSWORD=${{ secrets.TESTING_ADMIN_PASS || 'test123' }}
```

---

## ⚙️ Configuración

### Variables de Entorno

En tiempo de **build** (importante: no en runtime):

```bash
# Habilitar testing mode
ADMIN_TESTING_MODE=true

# Credenciales (opcionales, defaults a superadmin/superadmin)
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD=test123
```

### También se detectan

```bash
ENABLE_ADMIN_TESTING=true    # Alias de ADMIN_TESTING_MODE
TESTING_MODE=true            # Otro alias
```

---

## 📁 Archivos Generados

Durante build, si `ADMIN_TESTING_MODE=true`:

```
static/admin-ui/
├── auto-login.js              ← Script de auto-login
├── auto-login-config.json     ← Config JSON (primario)
└── index.html                 ← inyectado con referencias
```

El `auto-login-config.json`:

```json
{
  "enabled": true,
  "username": "admin",
  "password": "test123",
  "timestamp": "2026-05-10T15:30:00Z"
}
```

---

## 🔐 Seguridad

### ⚠️ NUNCA en producción

- Solo para **testing, staging, CI/CD**
- Nunca en `production` builds
- Los logs advierten claramente si está habilitado

### Logs

```
⚠️  ⚠️  ⚠️  ADMIN_TESTING_MODE ENABLED ⚠️  ⚠️  ⚠️
  Admin UI will be accessible WITHOUT LOGIN
  NEVER enable this in production!
```

### Validación

Vendure tiene checks para producción:
- `APP_ENV=production` no permitirá `ADMIN_TESTING_MODE=true` sin explícitamente setear
- Se puede agregar validation extra en `vendure-config.ts` si es necesario

---

## 🧪 Testing Localmente

### Desarrollo rápido

```bash
# Terminal 1: Start backend con testing mode
ADMIN_TESTING_MODE=true npm run dev

# Terminal 2: Access admin
# http://localhost:3002/admin
# (Auto-login automático)
```

### Con Docker local

```bash
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d --build

# Esperar a que esté listo
# http://localhost:3002/admin
```

---

## 🔄 Flujo Completo en CI/CD

1. **Trigger:** Push a `main` o PR
2. **Build:** `docker build -f apps/backend/Dockerfile ...` o `docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d --build`
3. **Test:** Ejecutar suite de tests
4. **Verify:** Verificar que auto-login está habilitado
5. **Deploy:** Desplegar a staging si todo OK
6. **Acceder:** Admin sin login en staging para QA

---

## 🐛 Debugging

### Verificar que está habilitado

```bash
# En el contenedor running
curl http://localhost:3002/auto-login-config.json
```

Debería retornar:
```json
{
  "enabled": true,
  "username": "admin",
  "password": "test123",
  "timestamp": "..."
}
```

### Logs del navegador

```javascript
// Abrir DevTools → Console
// Deberías ver:
[AutoLogin] Starting auto-login...
[AutoLogin] ✓ Auto-login successful!
[AutoLogin] Logged in as: admin
```

### Si no funciona

1. Verifica que `ADMIN_TESTING_MODE=true` fue pasada al build
2. Chequea que `auto-login-config.json` existe en `static/admin-ui/`
3. Verifica console del navegador para errores
4. Asegúrate que las credenciales matchean en `.env` y en build args

---

## 📚 Ejemplo Completo

### `infra/docker/docker-compose.yml`

```yaml
services:
  backend:
    build:
      context: ../../
      dockerfile: apps/backend/Dockerfile
      args:
        ADMIN_TESTING_MODE: true
        SUPERADMIN_USERNAME: admin
        SUPERADMIN_PASSWORD: test123
    environment:
      - ADMIN_TESTING_MODE=true
      - SUPERADMIN_USERNAME=admin
      - SUPERADMIN_PASSWORD=test123
    ports:
      - "127.0.0.1:3402:3001"
```

### `apps/backend/Dockerfile`

```dockerfile
ARG ADMIN_TESTING_MODE=false
ARG SUPERADMIN_USERNAME=superadmin
ARG SUPERADMIN_PASSWORD=superadmin
ENV ADMIN_TESTING_MODE=${ADMIN_TESTING_MODE}
ENV SUPERADMIN_USERNAME=${SUPERADMIN_USERNAME}
ENV SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD}

# ... rest of Dockerfile ...
```

### GitHub Actions

```yaml
- name: Build backend
  run: |
    docker build \
      --build-arg ADMIN_TESTING_MODE=true \
      --build-arg SUPERADMIN_USERNAME=admin \
      --build-arg SUPERADMIN_PASSWORD=test123 \
      -f apps/backend/Dockerfile \
      -t cla-backend-test .
```

---

## ✅ Checklist

- [ ] Variables de entorno configuradas en tiempo de build
- [ ] `ADMIN_TESTING_MODE=true` pasada a Docker build
- [ ] `auto-login-config.json` existe en static/admin-ui
- [ ] Script `auto-login.js` cargado en index.html
- [ ] Acceso a `/admin` sin login funciona
- [ ] Logs muestran auto-login exitoso
- [ ] Nunca habilitado en production builds

---

## 📖 Referencias

- **Scripts:** `apps/backend/scripts/prepare-admin-ui.js`
- **Config:** `apps/backend/src/config/vendure-config.ts` (variable `ADMIN_TESTING_MODE`)
- **Auto-login:** `apps/backend/static/admin-ui-branding/auto-login.js`
- **Ejemplos:** `infra/docker/.env`, `apps/backend/Dockerfile`, `infra/docker/docker-compose.yml`

---

## 🆘 Troubleshooting

### Problema: "No auto-login happening"

**Solución:**
```bash
# 1. Verifica que env var fue pasada al build
docker inspect <image> | grep ADMIN_TESTING

# 2. Chequea que auto-login-config.json existe
docker run -it <image> cat /app/static/admin-ui/auto-login-config.json

# 3. Verifica que index.html tiene referencias
docker run -it <image> grep -i "auto-login" /app/static/admin-ui/index.html
```

### Problema: "Login intento pero falla"

**Solución:**
```javascript
// En DevTools console:
fetch('/auto-login-config.json').then(r => r.json()).then(console.log)

// Y verifica que el username/password matchean
// En vendure-config.ts SUPERADMIN_USERNAME y PASSWORD
```

### Problema: "Funciona localmente pero no en Docker"

**Solución:**
- Asegúrate que variables de entorno están en Dockerfile o docker-compose, NO solo en .env
- Las variables de entorno deben estar durante `prepare-admin-ui` (antes del build final)
- Revisar logs de build para ver si detectó `ADMIN_TESTING_MODE=true`

---

**¿Preguntas?** Revisar logs en consola del navegador o stdout del contenedor.
