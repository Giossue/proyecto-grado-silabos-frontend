import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// La tabla de un campo de la ficha muestra un valor completo para comparar: no es un listado.
// La vista previa del diseñador de tablas repetibles muestra cómo queda la tabla: tampoco es un listado.
const IGNORED = ['src/components/ui/', 'src/components/domain/academic/FichaProposalValue.vue', 'src/components/domain/configuration/TemplateTableDesigner.vue'];

const vueFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  if (statSync(path).isDirectory()) return vueFiles(path);
  return path.endsWith('.vue') ? [path] : [];
});

const tableFiles = vueFiles('src').filter((path) => !IGNORED.some((ignored) => path.startsWith(ignored)) && /<Table[\s>]/.test(readFileSync(path, 'utf8')));

describe('Paginación de las tablas', () => {
  it('cada tabla tiene su paginación', () => {
    expect(tableFiles.length).toBeGreaterThan(10);
    expect(tableFiles.filter((path) => !readFileSync(path, 'utf8').includes('<TablePagination'))).toEqual([]);
  });

  it('la paginación se ve aunque la tabla esté vacía o tenga una sola página', () => {
    const hidden = tableFiles.filter((path) => /<TablePagination[^>]*v-if="[^"]*(total|length|last_page)/s.test(readFileSync(path, 'utf8')));
    expect(hidden).toEqual([]);
  });
});
