# Entrada para Claude

Este es el frontend de Sílabos UEB. Las reglas están en el repositorio del backend, que es el
directorio padre: lee primero `../AGENTS.md` y después solo la documentación que indique.

Flujo: ODD (ver «Flujo de trabajo: ODD» en `../AGENTS.md`). Un trabajo grande tiene un solo
documento en `../odd/tasks/<feature>.md`, aunque toque los dos repositorios. Se trabaja en
`main`; al terminar, commit sin push (el usuario decide cuándo subir).

Verificación: `npm run typecheck`, `npm run lint`, `npm test` y `npm run contract:check`.
