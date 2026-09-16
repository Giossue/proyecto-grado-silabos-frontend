# Sílabos UEB — Frontend

SPA independiente de Sílabos UEB, construida con Vue 3, TypeScript, Vite y Vue Router.
Consume únicamente la API versionada del repositorio
`proyecto-grado-silabos-backend`; no usa Inertia ni rutas o acciones generadas por
Laravel.

## Desarrollo

```bash
cp .env.example .env
npm ci
npm run dev
```

`VITE_API_URL` debe apuntar al origen de Laravel, sin `/api/v1`. Antes de iniciar sesión
el cliente solicita `/sanctum/csrf-cookie`; las credenciales nunca se persisten en el
navegador.

## Imagen independiente

La imagen sirve la SPA con Nginx en el puerto `8080` y expone
`GET /health/live`. La URL pública del backend se configura al arrancar, sin reconstruir
el JavaScript:

```bash
docker build -t silabos-frontend .
docker run --rm -p 8080:8080 \
  -e PUBLIC_API_URL=https://api.silabos.example.edu.ec \
  silabos-frontend
```

El backend debe incluir el origen del frontend en `FRONTEND_URL` y su host en
`SANCTUM_STATEFUL_DOMAINS`; ambos deben compartir el dominio raíz para que la cookie de
sesión `HttpOnly` funcione con `SESSION_DOMAIN`.

## Estado de migración

La base de sesión ya está integrada: inicio/cierre de sesión, cambio de contraseña
temporal y selección de rol/carrera. Las demás pantallas se trasladarán por unidades
verticales, manteniendo al backend como autoridad de permisos y reglas de dominio.
