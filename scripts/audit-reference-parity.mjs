import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allowedAliasRoutes,
  pages,
  reference,
} from './reference-parity-manifest.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referenceRepository = resolve(projectRoot, reference.repository);
const destinationRoot = resolve(projectRoot, 'src');

const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const git = (...args) => execFileSync('git', ['-C', referenceRepository, ...args], {
  encoding: 'utf8',
});
const referenceFile = (path) => git(
  'show',
  `${reference.commit}:${reference.frontendRoot}/${path}`,
);
const referenceFiles = git(
  'ls-tree',
  '-r',
  '--name-only',
  reference.commit,
  reference.frontendRoot,
).trim().split('\n').map((path) => path.replace(`${reference.frontendRoot}/`, ''));

const normalize = (value) => value
  .replaceAll(/\s+/g, ' ')
  .replaceAll(/>\s+</g, '><')
  .trim();
const digest = (value) => createHash('sha256').update(normalize(value)).digest('hex').slice(0, 12);
const templateOf = (source) => {
  const start = source.indexOf('<template');
  const openingEnd = start < 0 ? -1 : source.indexOf('>', start);
  const end = source.lastIndexOf('</template>');
  return openingEnd < 0 || end < 0 ? '' : source.slice(openingEnd + 1, end);
};
const stylesOf = (source) => [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((match) => match[1])
  .join('\n');
const componentImports = (source) => [...source.matchAll(/from\s+['"]@\/components\/([^'"]+)['"]/g)]
  .map((match) => `components/${match[1].replace(/\.vue$/, '')}.vue`)
  .sort();

const canonicalPages = referenceFiles
  .filter((path) => path.startsWith('pages/') && extname(path) === '.vue')
  .sort();
const declaredPages = pages.map(({ source }) => source).sort();
const undeclaredReferencePages = canonicalPages.filter((path) => !declaredPages.includes(path));
const unknownDeclaredPages = declaredPages.filter((path) => !canonicalPages.includes(path));

const routerSource = readFileSync(join(destinationRoot, 'router.ts'), 'utf8');
const actualRoutes = [...routerSource.matchAll(/\bpath:\s*["']([^"']+)["']/g)]
  .map((match) => match[1]);
const expectedRoutes = [...new Set([
  ...pages.flatMap(({ routes }) => routes),
  ...allowedAliasRoutes,
])];
const missingRoutes = expectedRoutes.filter((path) => !actualRoutes.includes(path));
const extraRoutes = actualRoutes.filter((path) => !expectedRoutes.includes(path));

const targetPages = new Set(pages.map(({ target }) => target));
const actualTargetPages = walk(join(destinationRoot, 'pages'))
  .filter((path) => extname(path) === '.vue')
  .map((path) => relative(destinationRoot, path))
  .sort();
const extraTargetPages = actualTargetPages.filter((path) => !targetPages.has(path));

const pageRows = pages.map((page) => {
  const targetPath = join(destinationRoot, page.target);
  if (!existsSync(targetPath)) {
    return { ...page, targetExists: false, template: 'ausente', styles: 'ausente', missingComponents: [] };
  }
  const source = referenceFile(page.source);
  const target = readFileSync(targetPath, 'utf8');
  const targetImports = new Set(componentImports(target));
  return {
    ...page,
    targetExists: true,
    template: digest(templateOf(source)) === digest(templateOf(target)) ? 'identico' : 'distinto',
    styles: digest(stylesOf(source)) === digest(stylesOf(target)) ? 'identico' : 'distinto',
    missingComponents: componentImports(source).filter((path) => !targetImports.has(path)),
  };
});

const canonicalSurfaceFiles = referenceFiles.filter((path) =>
  (path.startsWith('components/domain/') || path.startsWith('layouts/'))
  && extname(path) === '.vue',
);
const missingSurfaceFiles = canonicalSurfaceFiles.filter((path) =>
  !existsSync(join(destinationRoot, path)),
);
const destinationSurfaceFiles = walk(destinationRoot)
  .filter((path) => extname(path) === '.vue')
  .map((path) => relative(destinationRoot, path))
  .filter((path) => path.startsWith('components/domain/') || path.startsWith('layouts/'));
const extraSurfaceFiles = destinationSurfaceFiles.filter((path) =>
  !canonicalSurfaceFiles.includes(path),
);

const canonicalUiFiles = referenceFiles.filter((path) =>
  path.startsWith('components/ui/') && ['.vue', '.ts'].includes(extname(path)),
);
const uiRows = canonicalUiFiles.map((path) => {
  const targetPath = join(destinationRoot, path);
  if (!existsSync(targetPath)) return { path, state: 'faltante' };
  return {
    path,
    state: normalize(referenceFile(path)) === normalize(readFileSync(targetPath, 'utf8'))
      ? 'identico'
      : 'alterado',
  };
});

const forbiddenPattern = /@inertiajs\/|wayfinder|@\/actions\/|@\/routes(?:\/|['"])/i;
const forbiddenImports = walk(destinationRoot)
  .filter((path) => ['.vue', '.ts'].includes(extname(path)))
  .flatMap((path) => readFileSync(path, 'utf8').split('\n').flatMap((line, index) =>
    forbiddenPattern.test(line) ? [`${relative(projectRoot, path)}:${index + 1}`] : [],
  ));

const count = (values, value) => values.filter((item) => item === value).length;
console.log('# Auditoría de paridad contra el monolito');
console.log('');
console.log(`Referencia: \`${reference.commit}\` en \`${referenceRepository}\``);
console.log(`Páginas declaradas: ${pages.length}/${canonicalPages.length}.`);
console.log(`Rutas declaradas: ${expectedRoutes.length}; rutas SPA: ${actualRoutes.length}.`);
console.log('');
console.log('| Estado declarado | Páginas |');
console.log('| --- | ---: |');
for (const state of ['pendiente', 'identico', 'adaptado_api']) {
  console.log(`| ${state} | ${count(pages.map(({ status }) => status), state)} |`);
}
console.log('');
console.log('| ID | Fuente canónica | Destino SPA | Ruta/estado | Plantilla | Estilos | Componentes directos ausentes | Verificación |');
console.log('| --- | --- | --- | --- | --- | --- | ---: | --- |');
for (const row of pageRows) {
  const route = `${row.routes.join(', ')}${row.state ? ` · ${row.state}` : ''}`;
  console.log(`| ${row.id} | \`${row.source}\` | \`${row.target}\` | \`${route}\` | ${row.template} | ${row.styles} | ${row.missingComponents.length} | ${row.status} |`);
}

const list = (title, values) => {
  console.log('');
  console.log(`## ${title} (${values.length})`);
  console.log('');
  console.log(values.length ? values.map((value) => `- \`${value}\``).join('\n') : 'Ninguno.');
};

list('Páginas canónicas no declaradas', undeclaredReferencePages);
list('Páginas declaradas que no existen en la referencia', unknownDeclaredPages);
list('Páginas adicionales de la SPA', extraTargetPages);
list('Rutas faltantes', missingRoutes);
list('Rutas adicionales', extraRoutes);
list('Componentes de dominio/layout canónicos faltantes', missingSurfaceFiles);
list('Componentes de dominio/layout adicionales', extraSurfaceFiles);
list('Dependencias prohibidas', forbiddenImports);

console.log('');
console.log('## Componentes UI');
console.log('');
console.log(`- Idénticos: ${count(uiRows.map(({ state }) => state), 'identico')}`);
console.log(`- Alterados: ${count(uiRows.map(({ state }) => state), 'alterado')}`);
console.log(`- Faltantes: ${count(uiRows.map(({ state }) => state), 'faltante')}`);
for (const row of uiRows.filter(({ state }) => state !== 'identico')) {
  console.log(`- \`${row.path}\`: ${row.state}`);
}

const unresolved = [
  ...undeclaredReferencePages,
  ...unknownDeclaredPages,
  ...extraTargetPages,
  ...missingRoutes,
  ...extraRoutes,
  ...forbiddenImports,
  ...pages.filter(({ status }) => status === 'pendiente').map(({ source }) => source),
];
if (unresolved.length > 0) process.exitCode = 1;
