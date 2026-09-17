import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allowedAliasRoutes,
  allowedCanonicalRoutes,
  allowedExtraComponents,
  allowedExtraPages,
  componentAdaptationRules,
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
const componentImportSpecifiers = (source) => [...source.matchAll(/from\s+['"]@\/components\/([^'"]+)['"]/g)]
  .map((match) => match[1]);
const componentPath = (specifier) => `components/${specifier.replace(/\.vue$/, '')}.vue`;
const componentImports = (source) => componentImportSpecifiers(source).map(componentPath).sort();
const resolveComponentImport = (specifier) => {
  const candidates = specifier.endsWith('.vue')
    ? [join(destinationRoot, 'components', specifier)]
    : [
        join(destinationRoot, 'components', `${specifier}.vue`),
        join(destinationRoot, 'components', specifier, 'index.ts'),
        join(destinationRoot, 'components', specifier, 'index.vue'),
      ];
  return candidates.find(existsSync) ?? null;
};
const transitiveComponentImports = (entryPath) => {
  const imports = new Set();
  const visited = new Set();
  const visit = (path) => {
    if (!path || visited.has(path)) return;
    visited.add(path);
    const source = readFileSync(path, 'utf8');
    for (const specifier of componentImportSpecifiers(source)) {
      imports.add(componentPath(specifier));
      visit(resolveComponentImport(specifier));
    }
  };
  visit(entryPath);
  return imports;
};

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
  ...allowedCanonicalRoutes,
])];
const missingRoutes = expectedRoutes.filter((path) => !actualRoutes.includes(path));
const extraRoutes = actualRoutes.filter((path) => !expectedRoutes.includes(path));

const routeDeclarations = routerSource.split('\n')
  .filter((line) => line.includes('{ path:'))
  .map((line) => {
    const path = line.match(/\{ path:\s*["']([^"']+)["']/)?.[1];
    const roles = line.match(/roles:\s*\["([^"]+)"\]/)?.[1] ?? null;
    const requiresAuth = line.includes('requiresAuth: true');
    const aliasTarget = line.match(/aliasTarget:\s*["']([^"']+)["']/)?.[1] ?? null;
    return { path, roles, requiresAuth, aliasTarget };
  })
  .filter(({ path }) => path);
const routeDeclaration = (path) => routeDeclarations.find((route) => route.path === path);
const expectedRoleFor = (path) => path.startsWith('/admin/')
  ? 'administrador'
  : path.startsWith('/coordinacion/')
    ? 'coordinador'
    : path.startsWith('/docente/')
      ? 'docente'
      : null;
const routePolicyMismatches = expectedRoutes.flatMap((path) => {
  const expectedRole = expectedRoleFor(path);
  if (!expectedRole) return [];
  const declaration = routeDeclaration(path);
  return !declaration || declaration.roles !== expectedRole || declaration.requiresAuth !== true
    ? [`${path} (rol esperado: ${expectedRole}, declaración: ${declaration?.roles ?? 'sin rol'})`]
    : [];
});

const targetPages = new Set(pages.map(({ target }) => target));
const actualTargetPages = walk(join(destinationRoot, 'pages'))
  .filter((path) => extname(path) === '.vue')
  .map((path) => relative(destinationRoot, path))
  .sort();
const allowedExtraPagePaths = new Set(allowedExtraPages.map(({ path }) => path));
const extraTargetPages = actualTargetPages.filter((path) =>
  !targetPages.has(path) && !allowedExtraPagePaths.has(path));
const missingAllowedExtraPages = allowedExtraPages
  .filter(({ path }) => !actualTargetPages.includes(path))
  .map(({ path }) => path);

const pageRows = pages.map((page) => {
  const targetPath = join(destinationRoot, page.target);
  if (!existsSync(targetPath)) {
    return { ...page, targetExists: false, template: 'ausente', styles: 'ausente', missingComponents: [] };
  }
  const source = referenceFile(page.source);
  const target = readFileSync(targetPath, 'utf8');
  const targetImports = transitiveComponentImports(targetPath);
  const replacements = new Set(page.componentReplacements ?? []);
  return {
    ...page,
    targetExists: true,
    template: digest(templateOf(source)) === digest(templateOf(target)) ? 'identico' : 'distinto',
    styles: digest(stylesOf(source)) === digest(stylesOf(target)) ? 'identico' : 'distinto',
    missingComponents: componentImports(source).filter((path) =>
      !targetImports.has(path) && !replacements.has(path)),
  };
});

const canonicalComponentFiles = referenceFiles.filter((path) =>
  path.startsWith('components/') && extname(path) === '.vue',
);
const missingComponentFiles = canonicalComponentFiles.filter((path) =>
  !existsSync(join(destinationRoot, path)),
);
const destinationComponentFiles = walk(join(destinationRoot, 'components'))
  .filter((path) => extname(path) === '.vue')
  .map((path) => relative(destinationRoot, path));
const allowedExtraPaths = new Set(allowedExtraComponents.map(({ path }) => path));
const extraComponentFiles = destinationComponentFiles.filter((path) =>
  !canonicalComponentFiles.includes(path) && !allowedExtraPaths.has(path));
const missingAllowedExtraComponents = allowedExtraComponents
  .filter(({ path }) => !destinationComponentFiles.includes(path))
  .map(({ path }) => path);

const adaptationFor = (path) => componentAdaptationRules.find((rule) =>
  (rule.prefix && path.startsWith(rule.prefix)) || rule.files?.includes(path));
const componentRows = canonicalComponentFiles.map((path) => {
  const targetPath = join(destinationRoot, path);
  if (!existsSync(targetPath)) return { path, state: 'faltante', justification: null };
  if (normalize(referenceFile(path)) === normalize(readFileSync(targetPath, 'utf8'))) {
    return { path, state: 'identico', justification: null };
  }
  const adaptation = adaptationFor(path);
  return {
    path,
    state: adaptation ? 'adaptado_api' : 'alterado',
    justification: adaptation?.justification ?? null,
  };
});
const unclassifiedComponents = componentRows
  .filter(({ state }) => ['faltante', 'alterado'].includes(state))
  .map(({ path }) => path);

const canonicalLayoutFiles = referenceFiles.filter((path) =>
  path.startsWith('layouts/') && extname(path) === '.vue');
const destinationLayoutFiles = walk(join(destinationRoot, 'layouts'))
  .filter((path) => extname(path) === '.vue')
  .map((path) => relative(destinationRoot, path));
const missingLayoutFiles = canonicalLayoutFiles.filter((path) =>
  !destinationLayoutFiles.includes(path));
const extraLayoutFiles = destinationLayoutFiles.filter((path) =>
  !canonicalLayoutFiles.includes(path));
const layoutRows = canonicalLayoutFiles.map((path) => {
  const targetPath = join(destinationRoot, path);
  if (!existsSync(targetPath)) return { path, state: 'faltante' };
  return {
    path,
    state: normalize(referenceFile(path)) === normalize(readFileSync(targetPath, 'utf8'))
      ? 'identico'
      : 'adaptado_api',
  };
});

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
list('Adaptadores de página declarados que faltan', missingAllowedExtraPages);
list('Rutas faltantes', missingRoutes);
list('Rutas adicionales', extraRoutes);
list('Rutas con política de rol inconsistente', routePolicyMismatches);
list('Componentes canónicos faltantes', missingComponentFiles);
list('Componentes adicionales no autorizados', extraComponentFiles);
list('Adaptadores declarados que faltan', missingAllowedExtraComponents);
list('Layouts canónicos faltantes', missingLayoutFiles);
list('Layouts adicionales', extraLayoutFiles);
list('Dependencias prohibidas', forbiddenImports);

console.log('');
console.log('## Clasificación de componentes');
console.log('');
console.log(`- Idénticos: ${count(componentRows.map(({ state }) => state), 'identico')}`);
console.log(`- Adaptados a API: ${count(componentRows.map(({ state }) => state), 'adaptado_api')}`);
console.log(`- Alterados sin justificar: ${count(componentRows.map(({ state }) => state), 'alterado')}`);
console.log(`- Faltantes: ${count(componentRows.map(({ state }) => state), 'faltante')}`);
for (const extra of allowedExtraComponents) {
  console.log(`- \`${extra.path}\`: adaptador permitido — ${extra.justification}`);
}

console.log('');
console.log('## Clasificación de layouts');
console.log('');
console.log(`- Idénticos: ${count(layoutRows.map(({ state }) => state), 'identico')}`);
console.log(`- Adaptados a Vue Router/estado SPA: ${count(layoutRows.map(({ state }) => state), 'adaptado_api')}`);
console.log(`- Faltantes: ${count(layoutRows.map(({ state }) => state), 'faltante')}`);

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
  ...missingAllowedExtraPages,
  ...missingRoutes,
  ...extraRoutes,
  ...routePolicyMismatches,
  ...pageRows.flatMap(({ missingComponents }) => missingComponents),
  ...missingComponentFiles,
  ...extraComponentFiles,
  ...missingAllowedExtraComponents,
  ...unclassifiedComponents,
  ...missingLayoutFiles,
  ...extraLayoutFiles,
  ...forbiddenImports,
  ...pages.filter(({ status }) => status === 'pendiente').map(({ source }) => source),
  ...pages.filter(({ status, justification }) => status === 'adaptado_api' && !justification).map(({ source }) => source),
];
if (unresolved.length > 0) process.exitCode = 1;
