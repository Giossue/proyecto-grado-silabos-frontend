import { flushPromises, mount } from '@vue/test-utils';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import FormModal from '@/components/domain/FormModal.vue';

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  if (statSync(path).isDirectory()) return path.endsWith(join('components', 'ui')) ? [] : sourceFiles(path);
  return path.endsWith('.vue') ? [path] : [];
});

describe('descripción de los modales', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('FormModal muestra la descripción bajo el título', async () => {
    const wrapper = mount(FormModal, {
      attachTo: document.body,
      props: { open: true, triggerLabel: 'Crear', title: 'Crear docente', description: 'Le llegará un correo para activar su cuenta', showTrigger: false },
      slots: { default: '<p>Formulario</p>' },
    });
    await flushPromises();

    const dialog = document.querySelector('[role="dialog"]')!;
    const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
    expect(description?.textContent).toBe('Le llegará un correo para activar su cuenta');

    wrapper.unmount();
  });

  it('todo modal con título lleva una descripción', () => {
    const missing = sourceFiles('src').filter((path) => {
      if (/Form(Modal|Dialog)\.vue$/.test(path)) return false;
      const source = readFileSync(path, 'utf8');
      const titled = /<(Alert)?(Dialog|Sheet)Title\b/.test(source) && !/<(Alert)?(Dialog|Sheet)Description\b/.test(source);
      const wrapper = [...source.matchAll(/<Form(Modal|Dialog)\b[^>]*>/g)].some(([tag]) => /\btitle=/.test(tag) && !/\bdescription=/.test(tag));
      return titled || wrapper;
    });
    expect(missing).toEqual([]);
  });
});
