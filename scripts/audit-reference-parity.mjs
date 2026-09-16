import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const referenceRoot = resolve(
  projectRoot,
  process.env.REFERENCE_FRONTEND_ROOT
    ?? '../proyecto-grado-silabos/resources/js',
);
const destinationRoot = resolve(projectRoot, 'src');

if (!existsSync(referenceRoot)) {
  throw new Error(
    `No se encontró la referencia visual en ${referenceRoot}. Defina REFERENCE_FRONTEND_ROOT.`,
  );
}

const walk = (directory) => readdirSync(directory, { withFileTypes: true })
  .flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const relevantExtensions = new Set(['.vue', '.ts']);
const boundaryPattern = /@inertiajs\/|@\/routes(?:\/|['"])|wayfinder|usePage\(|createInertiaApp/;
const generatedRoots = new Set(['actions', 'routes', 'wayfinder']);

const rows = walk(referenceRoot)
  .filter((path) => relevantExtensions.has(extname(path)))
  .map((referencePath) => {
    const source = readFileSync(referencePath, 'utf8');
    const relativePath = relative(referenceRoot, referencePath);
    const destinationPath = join(destinationRoot, relativePath);
    if (generatedRoots.has(relativePath.split('/')[0])) {
      return { path: relativePath, state: 'retirar-wayfinder' };
    }
    if (!existsSync(destinationPath)) {
      return {
        path: relativePath,
        state: boundaryPattern.test(source) ? 'adaptar-frontera' : 'portar-directo',
      };
    }

    const destination = readFileSync(destinationPath, 'utf8');
    return {
      path: relativePath,
      state: source === destination ? 'identico' : 'portado-modificado',
    };
  });

const destinationOnly = walk(destinationRoot)
  .filter((path) => relevantExtensions.has(extname(path)))
  .map((path) => relative(destinationRoot, path))
  .filter((path) => !existsSync(join(referenceRoot, path)))
  .map((path) => ({ path, state: 'solo-spa' }));

const inventory = [...rows, ...destinationOnly].sort((left, right) =>
  left.path.localeCompare(right.path),
);
const counts = Object.groupBy(inventory, ({ state }) => state);

console.log('# Auditoría mecanizada de paridad visual');
console.log('');
console.log(`Referencia: \`${referenceRoot}\``);
console.log(`Destino: \`${destinationRoot}\``);
console.log('');
console.log('| Estado | Archivos |');
console.log('| --- | ---: |');
for (const state of ['identico', 'portado-modificado', 'portar-directo', 'adaptar-frontera', 'retirar-wayfinder', 'solo-spa']) {
  console.log(`| ${state} | ${counts[state]?.length ?? 0} |`);
}
console.log('');
console.log('| Archivo | Clasificación |');
console.log('| --- | --- |');
for (const row of inventory) console.log(`| \`${row.path}\` | ${row.state} |`);
