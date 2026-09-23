import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const currentRoot = join(process.cwd(), 'tests/visual/current');
const baselineRoot = join(process.cwd(), 'tests/visual/baseline');
const strict = process.argv.includes('--strict');

const aliases = {
  publico: { ingresar: 'login' },
  administrador: {
    panel: 'admin-panel',
    'administracion-procesos': 'admin-convocatorias',
    'administracion-usuarios': 'admin-usuarios',
    'administracion-estructura-academica-facultad': 'admin-estructura-academica-facultades',
    'administracion-estructura-academica-campus': 'admin-estructura-academica-campus',
    'administracion-estructura-academica-carrera': 'admin-estructura-academica-carreras',
    'administracion-estructura-academica-periodo': 'admin-estructura-academica-periodos-academicos',
    'administracion-plantilla': 'admin-plantilla',
    'administracion-auditoria': 'admin-auditoria',
    'administracion-trabajos': 'admin-procesos',
    'configuracion-perfil': 'admin-configuracion-perfil',
    'configuracion-seguridad': 'admin-configuracion-seguridad',
    'configuracion-apariencia': 'admin-configuracion-apariencia',
    notificaciones: 'admin-notificaciones',
  },
  coordinador: {
    panel: 'coordinacion-panel',
    'coordinacion-convocatorias': 'coordinacion-convocatorias',
    'coordinacion-revisiones': 'coordinacion-revisiones',
    'coordinacion-asignaciones-docentes': 'coordinacion-asignaciones-docentes',
    'coordinacion-materias-paralelos': 'coordinacion-materias-paralelos',
    'coordinacion-malla': 'coordinacion-malla',
    'coordinacion-fuentes': 'coordinacion-fuentes',
    'configuracion-perfil': 'coordinacion-configuracion-perfil',
    'configuracion-seguridad': 'coordinacion-configuracion-seguridad',
    'configuracion-apariencia': 'coordinacion-configuracion-apariencia',
    notificaciones: 'coordinacion-notificaciones',
  },
  docente: {
    panel: 'docente-panel',
    'mis-silabos': 'docente-mis-silabos',
    'configuracion-perfil': 'docente-configuracion-perfil',
    'configuracion-seguridad': 'docente-configuracion-seguridad',
    'configuracion-apariencia': 'docente-configuracion-apariencia',
    notificaciones: 'docente-notificaciones',
  },
};

const collectPngs = async (root) => {
  if (!existsSync(root)) return [];
  const entries = await readdir(root, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
};

const parseImage = (file) => {
  const relativePath = relative(currentRoot, file).split(sep);
  const role = relativePath.shift();
  const match = relativePath.join('-').match(/^(.+)-(light|dark)-(1440|360)\.png$/);
  if (!role || !match) return null;
  return { role, slug: match[1], variant: `${match[2]}-${match[3]}`, file };
};

const dimensions = async (file) => {
  const buffer = await readFile(file);
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  return `${buffer.readUInt32BE(16)}x${buffer.readUInt32BE(20)}`;
};

const pixelDifference = (baseline, current) => {
  const result = spawnSync('compare', ['-metric', 'AE', baseline, current, 'null:'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) return null;
  return (result.stderr || result.stdout || '').trim() || '0';
};

const normalizedDifference = (value) => {
  const match = value?.match(/\(([^)]+)\)$/);
  return match ? Number(match[1]) : Number(value ?? 0);
};

const currentImages = (await collectPngs(currentRoot)).map(parseImage).filter(Boolean);
const baselineImages = (await collectPngs(baselineRoot));
const baselineByKey = new Map();
for (const file of baselineImages) {
  const [role, ...pathParts] = relative(baselineRoot, file).split(sep);
  const match = pathParts.join('-').match(/^(.+)-(light|dark)-(1440|360)\.png$/);
  if (role && match) baselineByKey.set(`${role}:${match[1]}:${match[2]}-${match[3]}`, file);
}

const unmatchedCurrent = new Set();
const unmatchedBaseline = new Set(baselineImages.map((file) => relative(baselineRoot, file)));
const pairs = [];
const dimensionsMismatch = [];
const differences = [];

for (const image of currentImages) {
  const baselineSlug = aliases[image.role]?.[image.slug];
  if (!baselineSlug) {
    unmatchedCurrent.add(`${image.role}/${image.slug}`);
    continue;
  }
  const key = `${image.role}:${baselineSlug}:${image.variant}`;
  const baseline = baselineByKey.get(key);
  if (!baseline) {
    unmatchedCurrent.add(`${image.role}/${image.slug}`);
    continue;
  }
  const currentRelative = relative(currentRoot, image.file);
  const baselineRelative = relative(baselineRoot, baseline);
  unmatchedBaseline.delete(baselineRelative);
  const [currentSize, baselineSize] = await Promise.all([dimensions(image.file), dimensions(baseline)]);
  if (currentSize !== baselineSize) dimensionsMismatch.push(`${currentRelative} (${currentSize}) != ${baselineRelative} (${baselineSize})`);
  pairs.push({ currentRelative, baselineRelative, difference: pixelDifference(baseline, image.file) });
  if (normalizedDifference(pairs.at(-1).difference) > 0) differences.push(pairs.at(-1));
}

const routeSet = (items) => [...items].sort().join(', ') || 'ninguna';
console.log(`Comparación visual: ${pairs.length} pares, ${differences.length} con píxeles distintos, ${dimensionsMismatch.length} con dimensiones incompatibles.`);
console.log(`Superficies SPA sin línea base directa: ${routeSet(unmatchedCurrent)}.`);
const unmatchedBaselineRoutes = new Set([...unmatchedBaseline].map((file) => file.replace(/-(?:light|dark)-(?:1440|360)\.png$/, '')));
console.log(`Superficies de referencia sin destino SPA directo: ${routeSet(unmatchedBaselineRoutes)}.`);
if (dimensionsMismatch.length > 0) {
  console.error('Dimensiones incompatibles:\n' + dimensionsMismatch.map((item) => `- ${item}`).join('\n'));
  if (strict) process.exitCode = 1;
}

const changedPreview = [...differences]
  .sort((left, right) => normalizedDifference(right.difference) - normalizedDifference(left.difference))
  .slice(0, 12)
  .map(({ currentRelative, baselineRelative, difference }) => `- ${currentRelative} ↔ ${baselineRelative}: ${difference}`)
  .join('\n');
if (changedPreview) console.log(`Mayores diferencias de píxeles (datos/estado pueden variar; revisión humana):\n${changedPreview}`);
console.log('La comparación no aprueba automáticamente semejanza: los pares con datos dinámicos requieren revisión visual.');
if (dimensionsMismatch.length > 0 && !strict) {
  console.log('Modo informativo: usa `npm run test:visual-compare -- --strict` para convertir dimensiones incompatibles en fallo.');
}
