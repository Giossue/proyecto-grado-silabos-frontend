import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allowedAliasRoutes,
  allowedCanonicalRoutes,
  pages,
  reference,
} from './reference-parity-manifest.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referenceRepository = resolve(
  projectRoot,
  process.env.REFERENCE_REPOSITORY ?? reference.repository,
);
const referenceCommit = process.env.REFERENCE_COMMIT ?? reference.commit;
const destinationRoot = join(projectRoot, 'src');

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});
const read = (path) => readFileSync(path, 'utf8');
const sourceFiles = (root, directory) => walk(join(root, directory))
  .filter((path) => ['.vue', '.ts'].includes(extname(path)))
  .map((path) => relative(join(root, directory), path).replaceAll('\\', '/'));
const git = (...args) => execFileSync('git', ['-C', referenceRepository, ...args], { encoding: 'utf8' });
const referenceFile = (path) => git('show', `${referenceCommit}:${reference.frontendRoot}/${path}`);
const referencePageFile = (path) => referenceFile(`pages/${path}`);
const section = (title, body) => `\n## ${title}\n\n${body}\n`;
const unique = (values) => [...new Set(values)];

const monolithPageFiles = sourceFiles(referenceRepository, 'resources/js/pages');
const spaPageFiles = sourceFiles(projectRoot, 'src/pages');
const monolithComponentFiles = sourceFiles(referenceRepository, 'resources/js/components');
const spaComponentFiles = sourceFiles(projectRoot, 'src/components');
const monolithLayoutFiles = sourceFiles(referenceRepository, 'resources/js/layouts');
const spaLayoutFiles = sourceFiles(projectRoot, 'src/layouts');
const monolithRoutesSource = [
  read(join(referenceRepository, 'routes/web.php')),
  read(join(referenceRepository, 'routes/settings.php')),
].join('\n');
const spaRouterSource = read(join(projectRoot, 'src/router.ts'));
const spaSource = walk(destinationRoot)
  .filter((path) => ['.vue', '.ts'].includes(extname(path)))
  .map(read)
  .join('\n');

const routePaths = (source) => [...source.matchAll(/\bpath:\s*["']([^"']+)["']/g)].map((match) => match[1]);
const spaRoutes = routePaths(spaRouterSource);
const monolithRouteLiterals = unique([
  ...monolithRoutesSource.matchAll(/Route::(?:get|post|patch|put|delete|inertia|redirect)\(\s*["']([^"']+)["']/g),
].map((match) => match[1]));
const oldSpaReferences = unique([
  ...spaSource.matchAll(/["'`]([^"'`]*(?:\/administracion|\/mis-silabos)[^"'`]*)["'`]/g),
].map((match) => match[1]));

const visibleLoadingReferences = spaPageFiles.filter((file) => {
  const source = read(join(projectRoot, 'src/pages', file));
  return />\s*Cargando(?:…|\.\.\.)?\s*</i.test(source);
});
const loadingStateReferences = spaPageFiles.filter((file) =>
  /loading\.value|loading\s*=\s*ref/.test(read(join(projectRoot, 'src/pages', file))));
const loadErrorStateReferences = spaPageFiles.filter((file) =>
  /LoadErrorState/.test(read(join(projectRoot, 'src/pages', file))));
const asyncPagesWithoutLoadError = loadingStateReferences.filter((file) =>
  !loadErrorStateReferences.includes(file));
const monolithHasVisibleLoading = />\s*Cargando(?:…|\.\.\.)?\s*</i.test(
  monolithPageFiles.map(referencePageFile).join('\n'),
);

const intendedRouteSource = read(join(projectRoot, 'src/lib/intended-route.ts'));
const loginSource = read(join(projectRoot, 'src/pages/LoginPage.vue'));
const routerHasSessionIntended = /sessionStorage/.test(intendedRouteSource)
  && /rememberIntendedRoute\(/.test(spaRouterSource);
const loginConsumesIntended = /consumeIntendedRoute\(/.test(loginSource);
const loginUsesReplace = /router\.replace\(/.test(loginSource);

const missingPageMappings = pages
  .filter((page) => !existsSync(join(referenceRepository, 'resources/js', page.source))
    || !existsSync(join(projectRoot, 'src', page.target)))
  .map((page) => `${page.source} → ${page.target}`);
const sharedComponentPaths = monolithComponentFiles
  .filter((file) => existsSync(join(projectRoot, 'src/components', file)));
const missingCanonicalRoutes = pages.flatMap(({ routes }) => routes)
  .filter((path) => !spaRoutes.includes(path));
const allowedRoutes = unique([...allowedAliasRoutes, ...allowedCanonicalRoutes]);
const undeclaredSpaRoutes = spaRoutes.filter((path) => !allowedRoutes.includes(path)
  && !pages.some((page) => page.routes.includes(path)));

const lines = [
  '# Auditoría versionada: monolito vs SPA distribuida',
  '',
  `Generado: ${new Date().toISOString()}`,
  `Referencia: ${referenceCommit} en ${referenceRepository}`,
  '',
  '## Resultado ejecutivo',
  '',
  `- Páginas canónicas: **${pages.length}/${monolithPageFiles.length}** mapeadas; ${missingPageMappings.length ? `faltan ${missingPageMappings.length}` : 'sin faltantes'}.`,
  `- Componentes: monolito **${monolithComponentFiles.length}** · SPA **${spaComponentFiles.length}** · **${sharedComponentPaths.length}/${monolithComponentFiles.length}** comparten ruta relativa.`,
  `- Layouts: **${spaLayoutFiles.length}/${monolithLayoutFiles.length}** presentes en la SPA.`,
  `- Rutas Vue Router declaradas: **${spaRoutes.length}**.`,
  `- Literales de rutas Laravel detectados: **${monolithRouteLiterals.length}** (los grupos con prefijo requieren expansión contextual).`,
  `- Rutas canónicas del manifiesto faltantes: **${missingCanonicalRoutes.length}**.`,
  `- Rutas SPA no clasificadas por el manifiesto: **${undeclaredSpaRoutes.length}**.`,
];

lines.push(section('Diferencias propias de la distribución', [
  `- Páginas monolito con Inertia: **${monolithPageFiles.filter((file) => /@inertiajs\/vue3/.test(referencePageFile(file))).length}**.`,
  `- Páginas SPA que importan API: **${spaPageFiles.filter((file) => /@\/api\//.test(read(join(projectRoot, 'src/pages', file)))).length}**.`,
  '- La sustitución Inertia → Vue Router/API es esperada y debe revisarse por DTO, permisos, estados y acciones; la presencia de archivos no demuestra equivalencia funcional.',
].join('\n')));

lines.push(section('Carga', [
  `- El monolito contiene texto visible de carga: **${monolithHasVisibleLoading ? 'sí' : 'no'}**.`,
  `- Páginas SPA con texto visible “Cargando…”: **${visibleLoadingReferences.length}**.`,
  `- Páginas SPA con estado asíncrono de carga: **${loadingStateReferences.length}** (esto no implica que muestren texto suelto).`,
  `- Páginas SPA con estado reutilizable de error: **${loadErrorStateReferences.length}**.`,
  `- Páginas asíncronas sin estado reutilizable de error: **${asyncPagesWithoutLoadError.length}**${asyncPagesWithoutLoadError.length ? ` (${asyncPagesWithoutLoadError.join(', ')})` : ''}.`,
  '- El skeleton técnico puede conservarse como diferencia permitida de transporte; vacío, error y reintento deben permanecer diferenciados.',
].join('\n')));

lines.push(section('Redirección y recuperación de URL', [
  `- Destino previsto interno respaldado por sessionStorage: **${routerHasSessionIntended ? 'sí' : 'no'}**.`,
  `- Login consume el destino una sola vez: **${loginConsumesIntended ? 'sí' : 'no'}**.`,
  `- Login navega con replace: **${loginUsesReplace ? 'sí' : 'no'}**.`,
  '- La auditoría no considera `?redirect` una fuente de verdad; solo se acepta como alias de entrada validado.',
].join('\n')));

lines.push(section('Rutas y compatibilidad', [
  `- Alias permitidos por el manifiesto: **${allowedAliasRoutes.length}**.`,
  `- Rutas SPA no clasificadas: **${undeclaredSpaRoutes.length ? undeclaredSpaRoutes.map((path) => `\`${path}\``).join(', ') : 'ninguna'}**.`,
  `- Referencias históricas detectadas en código: **${oldSpaReferences.length}**.`,
  ...(oldSpaReferences.length ? oldSpaReferences.slice(0, 30).map((value) => `  - \`${value}\``) : ['  - Ninguna.']),
].join('\n')));

lines.push(section('Pendientes que requieren revisión humana o contractual', [
  '- Comparación página por página de estados cargado, vacío, error, bloqueo, solo lectura, diálogos, foco y responsive.',
  '- DTO de cada superficie consolidada frente a las props de su página canónica.',
  '- Respuestas 401/403/419, reintento seguro y pérdida de sesión.',
  '- Operaciones OpenAPI sin consumidor visible; clasificarlas como intencionales o faltantes.',
  '- Verificación de deep links en el servidor web de producción.',
].join('\n')));

const report = `${lines.join('\n')}\n`;
const writeIndex = process.argv.indexOf('--write');
if (writeIndex >= 0 && process.argv[writeIndex + 1]) {
  writeFileSync(resolve(projectRoot, process.argv[writeIndex + 1]), report);
}
process.stdout.write(report);

const hardFailures = [
  ...missingPageMappings,
  ...missingCanonicalRoutes,
  ...undeclaredSpaRoutes,
  ...asyncPagesWithoutLoadError.map((file) => `${file}: página asíncrona sin LoadErrorState`),
];
if (hardFailures.length > 0) process.exitCode = 1;
