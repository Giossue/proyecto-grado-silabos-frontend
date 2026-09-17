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

El Dockerfile usa la caché de BuildKit para el registro de npm y compila solo con Vite:
la comprobación de TypeScript queda en la puerta de CI. En Dokploy use el tipo de build
**Dockerfile**, la ruta `Dockerfile`, el contexto `.` y el puerto interno `8080`; no
seleccione la etapa `build`, pues la imagen final es la que contiene Nginx y el chequeo de
salud.

El backend debe incluir el origen del frontend en `FRONTEND_URL` y su host en
`SANCTUM_STATEFUL_DOMAINS`; ambos deben compartir el dominio raíz para que la cookie de
sesión `HttpOnly` funcione con `SESSION_DOMAIN`. `PUBLIC_API_URL` es obligatorio al
arrancar la imagen y debe contener solo el origen (`https://host[:puerto]`), sin ruta.

## Superficie disponible

La SPA cubre identidad completa —ingreso, recuperación y cambio de contraseña,
verificación de correo, segundo factor, sesiones y selección de ámbito— y las áreas de
Administración, Coordinación y Docencia. Incluye plantilla institucional, estructura
académica, procesos y convocatorias, fuentes, revisión, documentos privados, auditoría,
trabajos, informes, editor docente con autoguardado y tablas repetibles, observaciones y
asistencia de IA explicable.

Laravel sigue siendo la autoridad de permisos, alcance, validaciones y transiciones. Las
guardas de Vue y los controles ocultos no sustituyen la autorización del servidor.

## Verificación

```bash
npm run lint
npm run contract:check
npm test
npm run typecheck
npm run build
```

GitHub Actions ejecuta estas comprobaciones en cada cambio antes del despliegue. Para
desplegar desde Dokploy en un servidor con recursos limitados, publique la imagen desde
CI o un Build Server en un registry y configure Dokploy para consumir esa imagen.

El recorrido distribuido real se ejecuta aparte contra una base **de pruebas** recién
migrada y sembrada. Requiere que la API Laravel de pruebas esté escuchando en loopback;
el comando rechaza deliberadamente cualquier URL remota:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run test:e2e
```

Playwright comprueba ingreso y sesión por cookie, CSRF y creación administrativa,
plantilla, proceso, fuentes, logo, apertura de convocatoria, módulos de Coordinación,
borrador docente, autoguardado, persistencia después de recargar, carga de imágenes,
ausencia de respuestas 5xx y ausencia de desbordamiento global a 360 px.

La cobertura transversal de accesibilidad (foco de hojas, cierre con Escape y overflow
móvil) puede ejecutarse de forma aislada con:

```bash
VITE_API_URL=http://127.0.0.1:8000 npx playwright test tests/e2e/accessibility.spec.ts
```

Para revisar la paridad visual en local, levante la API aislada en loopback y ejecute:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run test:visual-spa
npm run test:visual-compare
```

La primera orden captura claro/oscuro a 1440 px y claro a 360 px para los tres roles en
`tests/visual/current/`. La segunda empareja esas capturas con la línea base generada
desde el monolito en `tests/visual/baseline/`, valida dimensiones y muestra diferencias
de píxeles. Los estados y datos dinámicos se revisan manualmente; el informe no sustituye
la aceptación visual. El comparador es informativo por defecto; para convertir las
dimensiones incompatibles en una puerta explícita, ejecuta
`npm run test:visual-compare -- --strict`.

El cliente prepara CSRF antes de cada mutación cuando hace falta, renueva una cookie CSRF
caducada una sola vez y, si la sesión deja de ser válida, limpia el estado local y vuelve
al ingreso.
