# Sílabos UEB — Frontend

SPA de Sílabos UEB hecha con Vue 3, TypeScript, Vite y Vue Router. Solo consume la API
`/api/v1` del repositorio `proyecto-grado-silabos-backend`.

Laravel decide permisos, alcance, validaciones y cambios de estado. Las guardas de Vue y
los botones ocultos solo ordenan la pantalla; no reemplazan la autorización del servidor.

## Qué cubre

- **Identidad:** ingreso, recuperación de contraseña, activación de cuenta, verificación de
  correo, segundo factor, perfil, seguridad y selección de carrera o rol.
- **Administración:** panel, convocatorias, usuarios y roles (con importación desde
  Excel), facultades y carreras, plantilla del sílabo (editor visual y «Editar JSON») y
  auditoría. Los textos del botón «Ayuda de esta pantalla» vienen fijos del backend.
- **Coordinación:** revisión con apertura y seguimiento de la convocatoria, revisión de
  sílabos (detalle y comparación de revisiones), materias y asignaciones, docentes, malla
  y proyecto de carrera. En el proyecto de carrera se llenan los campos de cada materia, se
  puede importar desde un documento y se marca por campo si «El docente puede editarlo».
- **Docencia:** mis sílabos, editor con autoguardado, copia desde otro paralelo,
  asistente de IA e historial.
- **Biblioteca:** revisiones de biblioteca y verificación de la bibliografía.
- **Documentos y firmas:** cada persona firma al decidir (docente al primer envío,
  coordinación al enviar a biblioteca y biblioteca al aprobar). La firma se hace en el
  navegador con el archivo `.p12` o `.pfx` del usuario; solo se envía la firma de la
  declaración. El PDF del sílabo aprobado se ve y se descarga desde «Documentos».
- **Comunes:** notificaciones, ayuda por pantalla y opciones de accesibilidad.

## Desarrollo

```bash
cp .env.example .env
npm ci
npm run dev
```

`VITE_API_URL` apunta al origen de Laravel, sin `/api/v1`. Antes de cada cambio el
cliente pide `/sanctum/csrf-cookie` si hace falta; si la cookie CSRF caducó la renueva una
vez y, si la sesión ya no es válida, limpia el estado y vuelve al ingreso. Las
credenciales no se guardan en el navegador.

El backend debe tener el origen del frontend en `FRONTEND_URL` y su host en
`SANCTUM_STATEFUL_DOMAINS`. Ambos deben compartir el dominio raíz para que la cookie de
sesión `HttpOnly` funcione con `SESSION_DOMAIN`.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite. |
| `npm run build` | `vue-tsc` y compilación de producción. |
| `npm run build:deploy` | Solo compilación con Vite (la usa el Dockerfile). |
| `npm run lint` | Pruebas de las reglas de arquitectura y ESLint. |
| `npm run contract:check` | Comprueba que las llamadas de `src/api/` existan en `docs/architecture/openapi.json` del backend (o en `OPENAPI_FILE`). |
| `npm run typecheck` | `vue-tsc --noEmit`. |
| `npm test` | Pruebas Vitest (`src/**/*.test.ts`). |
| `npm run test:e2e` | Pruebas Playwright de `tests/e2e/`. |

Antes de entregar un cambio:

```bash
npm run lint
npm run contract:check
npm test
npm run typecheck
npm run build
```

## Pruebas de extremo a extremo

Playwright corre contra una API Laravel **de pruebas**, recién migrada y sembrada, que
escuche en loopback. La configuración rechaza cualquier otra URL:

```bash
VITE_API_URL=http://127.0.0.1:8000 npm run test:e2e
```

Las cuentas que usan las pruebas son las del seeder del backend
(`admin@`, `coordinador@`, `docente@` y `bibliotecario@silabos.test`). Para correr un solo
archivo:

```bash
VITE_API_URL=http://127.0.0.1:8000 npx playwright test tests/e2e/accessibility.spec.ts
```

## Imagen de producción

La imagen sirve la SPA con Nginx en el puerto `8080` y expone `GET /health/live`. La URL
del backend se pasa al arrancar, sin recompilar:

```bash
docker build -t silabos-frontend .
docker run --rm -p 8080:8080 \
  -e PUBLIC_API_URL=https://api.silabos.example.edu.ec \
  silabos-frontend
```

`PUBLIC_API_URL` es obligatorio y debe ser solo el origen (`https://host[:puerto]`), sin
ruta. En Dokploy use el tipo de build **Dockerfile**, la ruta `Dockerfile`, el contexto
`.` y el puerto interno `8080`. No elija la etapa `build`: la imagen final es la que tiene
Nginx y el chequeo de salud.
