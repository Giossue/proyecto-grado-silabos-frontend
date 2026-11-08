import { mount } from '@vue/test-utils';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import EmptyState from '@/components/domain/EmptyState.vue';

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  if (statSync(path).isDirectory()) return sourceFiles(path);
  return path.endsWith('.vue') ? [path] : [];
});

describe('EmptyState', () => {
  it('el vacío sale dentro de una card, con ícono y sin punto final', () => {
    const wrapper = mount(EmptyState, { props: { title: 'La malla todavía no tiene materias.' } });

    expect(wrapper.get('[data-slot="card"]').find('[data-slot="empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-slot="empty-icon"] svg').exists()).toBe(true);
    expect(wrapper.text()).toBe('La malla todavía no tiene materias');
  });

  it('ninguna lista muestra su vacío como texto suelto: usa EmptyState (o TableEmpty dentro de una tabla)', () => {
    // Las páginas no dejan su vacío como texto suelto; dentro de modales, menús y editores sí puede ir texto.
    const loose = sourceFiles('src/pages')
      .filter((path) => /<(p|div)\b[^>]*v-(else-)?if="[^"]*(!\w+\.length|length === 0)"[^>]*text-muted-foreground/.test(readFileSync(path, 'utf8')));

    expect(loose).toEqual([]);
  });
});
