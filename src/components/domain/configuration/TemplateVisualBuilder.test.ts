import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as structure from '@/api/template-structure';
import { ApiError } from '@/api/client';
import type { TemplatePayload } from '@/api/template';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { emptyDocument, type FieldResponsible } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

vi.mock('@/api/template-structure');

type Template = NonNullable<TemplatePayload['template']>;
const field = (id: string, label: string, quien_llena: FieldResponsible = 'docente') => ({ id, key: id, label, help: null, quien_llena, content: emptyDocument() });
const template: Template = {
  id: 't1', name: 'Plantilla', description: null, titleBlock: { text: 'SÍLABO' },
  sections: [
    { id: 's1', key: 'uno', title: 'Uno', description: null, orientation: 'portrait', fields: [field('f1', 'Primero'), field('f2', 'Segundo', 'coordinacion')] },
    { id: 's2', key: 'dos', title: 'Dos', description: null, orientation: 'portrait', fields: [] },
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
const choose = async (key: string) => click(body().querySelector(`#new-section-field-responsible-${key}, #template-field-responsible-${key}`));

describe('TemplateVisualBuilder', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
    for (const fn of Object.values(structure)) if (vi.isMockFunction(fn)) fn.mockResolvedValue({ message: 'ok', section_id: 'new-section' } as never);
  });

  it('agrega el campo en la posición donde se pasó el cursor, no al final', async () => {
    vi.mocked(structure.createField).mockResolvedValue({ message: 'ok', field: { id: 'nuevo' } } as never);
    mountBuilder();
    const points = [...body().querySelectorAll<HTMLElement>('[data-insert-point] button')].filter((el) => el.textContent?.trim() === 'Agregar campo');
    await click(points[1]);
    await type('template-field-label', 'Entre los dos');
    await click([...body().querySelectorAll<HTMLElement>('[role="dialog"] button[type="submit"]')][0]);

    expect(structure.createField).toHaveBeenCalled();
    expect(structure.reorderFields).toHaveBeenCalledWith('t1', 's1', ['f1', 'nuevo', 'f2']);
  });

  it('permite elegir cualquiera de los tres responsables y editar un documento', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    for (const key of ['docente', 'coordinacion', 'institucional']) expect(body().querySelector(`#template-field-responsible-${key}`)).toBeTruthy();
    expect(body().querySelector('[aria-label="Contenido inicial"]')).toBeTruthy();
    expect(body().textContent).not.toContain('Tabla de filas fijas');
    expect(body().textContent).toContain('El docente lo consulta.');
  });

  it('dibuja la tabla oficial de identificación y no subtitula los campos sin nombre', () => {
    const table: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'FACULTAD: CIENCIAS ADMINISTRATIVAS' }] }] }] }] }] };
    const official: Template = {
      ...template,
      sections: [{ id: 's1', key: 'identificacion', title: 'Identificación Institucional', description: null, orientation: 'portrait', fields: [
        { ...field('a', '', 'institucional'), content: table },
        field('d', 'Estudiantes con discapacidad: Tipo de discapacidad'),
      ] }],
    };
    mount(TemplateVisualBuilder, { props: { template: official }, attachTo: document.body });
    expect(body().querySelector('[data-field="a"] table')?.textContent).toContain('FACULTAD: CIENCIAS ADMINISTRATIVAS');
    expect(body().textContent).not.toContain('Se completa con los datos del sílabo');
    expect(body().textContent).toContain('Identificación Institucional');
    expect(body().querySelector('[data-field="a"] h4')).toBeNull();
    expect(body().querySelector('[data-field="d"] h4')?.textContent?.trim()).toBe('Estudiantes con discapacidad: Tipo de discapacidad');
    expect(body().querySelector('[data-field="a"] [data-field-responsible]')?.textContent).toContain('Institucional');
    expect(body().textContent).not.toMatch(/\b1\.[1-9]\b/);
  });

  it('deja que la etiqueta del tipo y el nombre largo bajen de línea sin desbordar', () => {
    const long = 'Lo escribe Coordinación en la ficha de la asignatura';
    mountBuilder();
    const row = body().querySelector('[data-field="f2"] [data-field-responsible]')!;
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
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ quien_llena: 'docente', label: '', key: 'campo', content: emptyDocument() }));
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('agrega una ficha que el docente solo ve', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await type('template-field-label', 'Perfil');
    await choose('coordinacion');
    expect(body().querySelector('#field-config-adjustable')).toBeNull();
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ quien_llena: 'coordinacion', label: 'Perfil', key: 'perfil', content: emptyDocument() }));
  });

  it('agrega un campo institucional con el mismo editor', async () => {
    mountBuilder();
    await click(byText('button', 'Agregar campo'));
    await choose('institucional');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ quien_llena: 'institucional', content: emptyDocument() }));
  });

  it('la nueva sección pide solo el nombre y la orientación, sin diseños oficiales', async () => {
    mountBuilder();
    await click(byText('button', 'Nueva sección'));
    expect(body().querySelector('#template-section-title')).toBeTruthy();
    expect(body().querySelector('#section-orientation')).toBeTruthy();
    expect(body().textContent).not.toContain('diseño oficial');
    expect(body().querySelector('[data-design]')).toBeNull();
  });

  it('crea una sección con un solo paso y valida el nombre', async () => {
    const wrapper = mountBuilder();
    await click(byText('button', 'Nueva sección'));
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(body().textContent).toContain('Escriba el nombre de la sección.');
    expect(structure.createSection).not.toHaveBeenCalled();
    await type('template-section-title', 'Objetivos de la asignatura');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.createSection).toHaveBeenCalledWith('t1', { key: 'objetivos_de_la_asignatura', title: 'Objetivos de la asignatura', orientation: 'portrait' });
    expect(structure.createField).not.toHaveBeenCalled();
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('el título y los logos son fijos y no aparecen como campos editables', () => {
    mount(TemplateVisualBuilder, { props: { template, logos: { institution: '/institution.png', faculty: '/faculty.png', institution_size: { width: 120, height: 40 }, faculty_size: { width: 120, height: 40 } } }, attachTo: document.body });
    expect(body().querySelector('h2')?.textContent).toBe('SÍLABO');
    expect(body().querySelectorAll('header img')).toHaveLength(2);
    expect(body().textContent).not.toContain('Editar título');
    expect(body().textContent).not.toContain('Cambiar logo');
  });

  it('renombra una sección y cambia las propiedades de un campo', async () => {
    mountBuilder();
    await click(body().querySelector('[aria-label="Renombrar la sección Uno"]'));
    await type('template-section-title', 'Uno bis');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.renameSection).toHaveBeenCalledWith('t1', 's1', 'Uno bis', 'portrait');

    await click(body().querySelector('[aria-label="Propiedades del campo Primero"]'));
    await type('template-field-label', '');
    await choose('coordinacion');
    await click(body().querySelector('[role="dialog"] button[type="submit"]'));
    expect(structure.updateField).toHaveBeenCalledWith('t1', 'f1', expect.objectContaining({ label: '', quien_llena: 'coordinacion' }));
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
    expect(body().textContent).not.toContain('Hay un proceso abierto');
    expect(byText('button', 'Nueva sección')).toBeUndefined();
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Bajar la sección Uno"]')!.disabled).toBe(true);
    expect(byText('button', 'Agregar campo')).toBeUndefined();
  });
});
