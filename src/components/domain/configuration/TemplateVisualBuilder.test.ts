import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as structure from '@/api/template-structure';
import { ApiError } from '@/api/client';
import type { TemplatePayload } from '@/api/template';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { fieldTypeKeys, fieldTypeRegistry } from '@/components/domain/fieldTypes/registry';

vi.mock('@/api/template-structure');

type Template = NonNullable<TemplatePayload['template']>;
const field = (id: string, label: string, type = 'texto') => ({ id, block_id: `b-${id}`, key: id, label, help: null, type, config: [] });
const template: Template = {
  id: 't1', name: 'Plantilla', description: null, titleBlock: { text: 'SÍLABO' },
  sections: [
    { id: 's1', key: 'uno', title: 'Uno', description: null, blocks: [{ id: 'b-f1', key: 'f1', title: '', fields: [field('f1', 'Primero')] }, { id: 'b-f2', key: 'f2', title: '', fields: [field('f2', 'Segundo', 'ficha')] }] },
    { id: 's2', key: 'dos', title: 'Dos', description: null, blocks: [] },
  ],
};

const mountBuilder = (props: { processLock?: string | null } = {}) => mount(TemplateVisualBuilder, { props: { template, ...props }, attachTo: document.body });

const body = () => document.body;
const byText = (selector: string, text: string) => [...body().querySelectorAll<HTMLElement>(selector)].find((el) => el.textContent?.trim() === text);
const click = async (el: Element | undefined | null) => { expect(el).toBeTruthy(); (el as HTMLElement).click(); await flushPromises(); };
const type = async (id: string, value: string) => {
  const input = body().querySelector<HTMLInputElement>(`#${id}`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};
const choose = async (key: string) => click(body().querySelector(`#new-section-field-type-${key}, #template-field-type-${key}`));

describe('TemplateVisualBuilder', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
    for (const fn of Object.values(structure)) if (vi.isMockFunction(fn)) fn.mockResolvedValue({ message: 'ok', section_id: 'new-section' } as never);
  });

  it('ofrece los tipos desde el registro con lenguaje para Administración', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    for (const key of fieldTypeKeys) expect(body().querySelector(`#template-field-type-${key}`), key).toBeTruthy();
    expect(body().textContent).toContain('Lo escribe el docente');
    expect(body().textContent).toContain('Lo escribe Coordinación en la ficha de la asignatura');
    expect(body().textContent).toContain('Tabla de filas fijas');
    expect(body().textContent).toContain('Dato automático');
    expect(body().textContent).toContain('Texto fijo igual para todos');
  });

  it('dibuja la tabla oficial de identificación y no subtitula los campos sin nombre', () => {
    const table = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'FACULTAD: CIENCIAS ADMINISTRATIVAS' }] }] }] }] }] };
    const official: Template = {
      ...template,
      sections: [{ id: 's1', key: 'identificacion', title: 'Identificación Institucional', description: null, blocks: [
        { id: 'b-a', key: 'a', title: '', fields: [{ ...field('a', '', 'automatico'), config: { source: 'identification_card' }, document: table }] },
        { id: 'b-d', key: 'd', title: '', fields: [field('d', 'Estudiantes con discapacidad: Tipo de discapacidad')] },
      ] }],
    };
    mount(TemplateVisualBuilder, { props: { template: official }, attachTo: document.body });
    expect(body().querySelector('[data-field="a"] table')?.textContent).toContain('FACULTAD: CIENCIAS ADMINISTRATIVAS');
    expect(body().textContent).not.toContain('Se completa con los datos del sílabo');
    expect(body().textContent).toContain('1. Identificación Institucional');
    expect(body().querySelector('[data-field="a"] h4')).toBeNull();
    expect(body().querySelector('[data-field="d"] h4')?.textContent?.trim()).toBe('Estudiantes con discapacidad: Tipo de discapacidad');
    expect(body().textContent).not.toMatch(/\b1\.[1-9]\b/);
  });

  it('deja que la etiqueta del tipo y el nombre largo bajen de línea sin desbordar', () => {
    const long = 'Lo escribe Coordinación en la ficha de la asignatura';
    mountBuilder();
    const row = body().querySelector('[data-field="f2"] [data-field-type]')!;
    expect(row.parentElement?.className).toContain('flex-wrap');
    expect(row.className).toContain('max-w-full');
    expect(row.textContent!.length).toBeGreaterThan(0);
    expect(long.length).toBeGreaterThan(40);
    expect(body().querySelector('[data-field="f2"] h4')?.className).toContain('min-w-0');
  });

  it('agrega un campo de texto sin nombre', async () => {
    const wrapper = mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ type: 'texto', label: '', key: 'campo', config: {} }));
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('agrega una ficha ajustable por el docente', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await type('template-field-label', 'Perfil');
    await choose('ficha');
    await click(body().querySelector('#field-config-adjustable'));
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ type: 'ficha', label: 'Perfil', key: 'perfil', config: { adjustable: true } }));
  });

  it('agrega una tabla con columnas y filas y valida que no quede vacía', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await choose('tabla');
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Quitar columna 1"]')!.disabled).toBe(true);
    await click(byText('button', 'Agregar columna'));
    await click(byText('button', 'Agregar fila'));
    await type('table-columns-columna_1', '');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(body().textContent).toContain('Escriba el nombre de cada columna.');
    expect(structure.createField).not.toHaveBeenCalled();
    await type('table-columns-columna_1', 'Tema');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    const config = vi.mocked(structure.createField).mock.calls[0]![2].config as { columns: unknown[]; rows: unknown[] };
    expect(config.columns).toHaveLength(2);
    expect(config.rows).toHaveLength(2);
  });

  it('agrega un dato automático eligiendo la fuente', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await choose('automatico');
    expect(body().querySelector('#field-config-source')).toBeTruthy();
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ type: 'automatico', config: { source: 'identification_card' } }));
  });

  it('exige el contenido de un texto fijo', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await choose('fijo');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(body().textContent).toContain('Escriba el texto fijo; no puede quedar vacío.');
    expect(structure.createField).not.toHaveBeenCalled();
  });

  it('cada tipo del registro aporta su pieza de configuración y su validación', () => {
    for (const key of fieldTypeKeys) {
      expect(fieldTypeRegistry[key].BuilderComponent, key).toBeTruthy();
      expect(fieldTypeRegistry[key].adminLabel, key).not.toBe('');
      expect(fieldTypeRegistry[key].validateConfig(structuredClone(fieldTypeRegistry[key].defaultConfig) as Record<string, unknown>)).toSatisfy((m: unknown) => m === null || typeof m === 'string');
    }
  });

  it('crea una sección en dos pasos', async () => {
    mountBuilder();
    await click(byText('button', 'Nueva sección'));
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(body().textContent).toContain('Escriba el nombre de la sección.');
    await type('template-section-title', 'Objetivos de la asignatura');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(body().textContent).toContain('Paso 2 de 2');
    await click(byText('button', 'Crear sin campos'));
    expect(structure.createSection).toHaveBeenCalledWith('t1', { key: 'objetivos_de_la_asignatura', title: 'Objetivos de la asignatura' });
    expect(structure.createField).not.toHaveBeenCalled();
  });

  it('crea una sección con su primer campo', async () => {
    mountBuilder();
    await click(byText('button', 'Nueva sección'));
    await type('template-section-title', 'Firmas');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    await type('new-section-field-label', 'Cuerpo');
    await click(byText('button', 'Crear sección con este campo'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 'new-section', expect.objectContaining({ type: 'texto', label: 'Cuerpo' }));
  });

  it('renombra una sección y cambia las propiedades de un campo', async () => {
    mountBuilder();
    await click(body().querySelector('[aria-label="Renombrar la sección Uno"]'));
    await type('template-section-title', 'Uno bis');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.renameSection).toHaveBeenCalledWith('t1', 's1', 'Uno bis');

    await click(body().querySelector('[aria-label="Propiedades del campo Primero"]'));
    await type('template-field-label', '');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.updateField).toHaveBeenCalledWith('t1', 'f1', expect.objectContaining({ label: '' }));
  });

  it('reordena secciones y campos subiendo y bajando', async () => {
    mountBuilder();
    await click(body().querySelector('[aria-label="Bajar la sección Uno"]'));
    expect(structure.reorderSections).toHaveBeenCalledWith('t1', ['s2', 's1']);
    await click(body().querySelector('[aria-label="Subir el campo Segundo"]'));
    expect(structure.reorderFields).toHaveBeenCalledWith('t1', 's1', ['f2', 'f1']);
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Subir la sección Uno"]')!.disabled).toBe(true);
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Bajar el campo Segundo"]')!.disabled).toBe(true);
  });

  it('elimina un campo y una sección tras confirmar', async () => {
    mountBuilder();
    await click(body().querySelector('[aria-label="Eliminar el campo Primero"]'));
    expect(structure.deleteField).not.toHaveBeenCalled();
    await click(byText('button', 'Eliminar'));
    expect(structure.deleteField).toHaveBeenCalledWith('t1', 'f1');
    await click(body().querySelector('[aria-label="Eliminar la sección Uno"]'));
    expect(body().textContent).toContain('con sus 2 campos');
    await click(byText('button', 'Eliminar'));
    expect(structure.deleteSection).toHaveBeenCalledWith('t1', 's1');
  });

  it('muestra el mensaje del servidor cuando un proceso abierto rechaza el cambio', async () => {
    vi.mocked(structure.reorderSections).mockRejectedValue(new ApiError('Hay un proceso abierto: pause la convocatoria.', 409));
    mountBuilder();
    await click(body().querySelector('[aria-label="Bajar la sección Uno"]'));
    expect(body().textContent).toContain('Hay un proceso abierto: pause la convocatoria.');
  });

  it('bloquea todo el constructor con un proceso abierto', async () => {
    mountBuilder({ processLock: 'proceso' });
    expect(body().textContent).toContain('Hay un proceso abierto');
    expect(byText('button', 'Nueva sección')!.hasAttribute('disabled')).toBe(true);
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Bajar la sección Uno"]')!.disabled).toBe(true);
    expect(byText('button', 'Agregar campo')!.hasAttribute('disabled')).toBe(true);
  });
});
