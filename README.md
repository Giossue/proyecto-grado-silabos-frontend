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

## Estado de migración

La base de sesión ya está integrada: inicio/cierre de sesión, cambio de contraseña
temporal y selección de rol/carrera. Las demás pantallas se trasladarán por unidades
verticales, manteniendo al backend como autoridad de permisos y reglas de dominio.
