import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as structure from '@/api/template-structure';
import { ApiError } from '@/api/client';
import type { TemplatePayload } from '@/api/template';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { DropdownMenuRadioGroup } from '@/components/ui/dropdown-menu';
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

const presets = [
  { key: 'identificacion' as const, label: 'Datos de identificación', quien_llena: 'institucional' as FieldResponsible, content: { type: 'doc', content: [{ type: 'table', content: [] }] } as DocumentNode },
  { key: 'planificacion' as const, label: 'Unidades', quien_llena: 'docente' as FieldResponsible, content: { type: 'doc', content: [{ type: 'table', content: [] }] } as DocumentNode },
  { key: 'firmas' as const, label: 'Revisión y aprobación', quien_llena: 'institucional' as FieldResponsible, content: { type: 'doc', content: [{ type: 'table', content: [] }] } as DocumentNode },
];
const mountBuilder = async (props: { processLock?: string | null } = {}) => {
  const wrapper = mount(TemplateVisualBuilder, { props: { template, presets, ...props }, attachTo: document.body });
  if (!props.processLock) await click(byText('button', 'Editar'));
  return wrapper;
};

const body = () => document.body;
const byText = (selector: string, text: string) => [...body().querySelectorAll<HTMLElement>(selector)].find((el) => el.textContent?.trim() === text);
const click = async (el: Element | undefined | null) => { expect(el).toBeTruthy(); (el as HTMLElement).click(); await flushPromises(); };
const typeInto = async (label: string, value: string) => {
  const input = body().querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
  return input;
};

describe('TemplateVisualBuilder', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    document.body.innerHTML = '';
    for (const fn of Object.values(structure)) if (vi.isMockFunction(fn)) fn.mockResolvedValue({ message: 'ok', section_id: 'new-section', field: { id: 'nuevo' } } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('muestra cada sección y cada campo editables sobre la hoja, sin modales', async () => {
    await mountBuilder();
    await vi.advanceTimersByTimeAsync(50);
    expect(body().querySelector<HTMLInputElement>('[aria-label="Sección Uno"]')!.value).toBe('Uno');
    expect(body().querySelector<HTMLInputElement>('[aria-label="Nombre del campo Primero"]')!.value).toBe('Primero');
    expect(body().querySelectorAll('[data-field-editor]')).toHaveLength(2);
    expect(body().querySelector('[role="dialog"]')).toBeNull();
    expect(body().querySelector('[aria-label="Contenido de Primero"]')).toBeTruthy();
  });

  it('guarda solo el nombre del campo al dejar de escribir', async () => {
    await mountBuilder();
    await typeInto('Nombre del campo Primero', 'Primer campo');
    expect(structure.updateField).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(900);
    expect(structure.updateField).toHaveBeenCalledTimes(1);
    expect(structure.updateField).toHaveBeenCalledWith('t1', 'f1', expect.objectContaining({ label: 'Primer campo', quien_llena: 'docente', content: emptyDocument() }));
  });

  it('cambia quién llena el campo desde su menú y lo guarda enseguida', async () => {
    const wrapper = await mountBuilder();
    expect(body().querySelector('[aria-label="Quién llena el campo Primero"]')!.textContent).toContain('Docente');
    const group = wrapper.findAllComponents(DropdownMenuRadioGroup)[0];
    expect(group).toBeUndefined();
    const field = wrapper.findAllComponents({ name: 'TemplateSheetField' })[0]!;
    (field.vm as unknown as { $: { setupState: { draft: { quien_llena: string } } } }).$.setupState.draft.quien_llena = 'institucional';
    await vi.advanceTimersByTimeAsync(10);
    expect(structure.updateField).toHaveBeenCalledWith('t1', 'f1', expect.objectContaining({ quien_llena: 'institucional' }));
  });

  it('aplica una plantilla lista: pone su nombre, su contenido y quién lo llena, y lo guarda', async () => {
    const wrapper = await mountBuilder();
    const field = wrapper.findAllComponents({ name: 'TemplateSheetField' })[0]!;
    (field.vm as unknown as { $: { setupState: { applyPreset: (preset: unknown) => void } } }).$.setupState.applyPreset(presets[0]);
    await vi.advanceTimersByTimeAsync(900);
    expect(structure.updateField).toHaveBeenCalledWith('t1', 'f1', expect.objectContaining({ label: 'Datos de identificación', quien_llena: 'institucional', content: presets[0]!.content }));
  });

  it('agrega el campo vacío de inmediato, en la posición donde se pasó el cursor', async () => {
    await mountBuilder();
    const points = [...body().querySelectorAll<HTMLElement>('[data-insert-point] button')].filter((el) => el.textContent?.trim() === 'Agregar campo');
    await click(points[1]);
    expect(structure.createField).toHaveBeenCalledWith('t1', 's1', expect.objectContaining({ quien_llena: 'docente', label: '', content: emptyDocument() }));
    expect(structure.reorderFields).toHaveBeenCalledWith('t1', 's1', ['f1', 'nuevo', 'f2']);
    expect(body().querySelector('[role="dialog"]')).toBeNull();
  });

  it('agrega una sección «Nueva sección» de inmediato y avisa del cambio', async () => {
    const wrapper = await mountBuilder();
    await click(body().querySelector('[aria-label="Nueva sección"]'));
    expect(structure.createSection).toHaveBeenCalledWith('t1', expect.objectContaining({ title: 'Nueva sección', orientation: 'portrait' }));
    expect(wrapper.emitted('changed')).toHaveLength(1);
    expect(body().querySelector('[role="dialog"]')).toBeNull();
  });

  it('renombra la sección al salir del campo y cambia su orientación', async () => {
    const wrapper = await mountBuilder();
    const input = await typeInto('Sección Uno', 'Uno bis');
    input.dispatchEvent(new Event('blur'));
    await flushPromises();
    expect(structure.renameSection).toHaveBeenCalledWith('t1', 's1', 'Uno bis', 'portrait');

    await click(body().querySelector('[aria-label="Orientación de la sección Uno"]'));
    expect(structure.renameSection).toHaveBeenLastCalledWith('t1', 's1', 'Uno', 'landscape');
    expect(wrapper.emitted('changed')).toBeTruthy();
  });

  it('no renombra la sección si el nombre queda vacío', async () => {
    await mountBuilder();
    const input = await typeInto('Sección Uno', '   ');
    input.dispatchEvent(new Event('blur'));
    await flushPromises();
    expect(structure.renameSection).not.toHaveBeenCalled();
  });

  it('reordena secciones y campos subiendo y bajando', async () => {
    await mountBuilder();
    await click(body().querySelector('[aria-label="Bajar la sección Uno"]'));
    expect(structure.reorderSections).toHaveBeenCalledWith('t1', ['s2', 's1']);
    await click(body().querySelector('[aria-label="Subir el campo Segundo"]'));
    expect(structure.reorderFields).toHaveBeenCalledWith('t1', 's1', ['f2', 'f1']);
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Subir la sección Uno"]')!.disabled).toBe(true);
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Bajar el campo Segundo"]')!.disabled).toBe(true);
  });

  it('elimina campos y secciones solo tras confirmar', async () => {
    await mountBuilder();
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
    await mountBuilder();
    await click(body().querySelector('[aria-label="Bajar la sección Uno"]'));
    expect(body().textContent).toContain('Hay un proceso abierto: pause la convocatoria.');
  });

  it('avisa si no se pudo guardar un campo', async () => {
    vi.mocked(structure.updateField).mockRejectedValue(new ApiError('No se pudo guardar.', 422));
    await mountBuilder();
    await typeInto('Nombre del campo Primero', 'X');
    await vi.advanceTimersByTimeAsync(900);
    await flushPromises();
    expect(body().textContent).toContain('No se pudo guardar.');
  });

  it('con un proceso abierto no deja entrar a editar', async () => {
    await mountBuilder({ processLock: 'proceso' });
    expect(byText('button', 'Editar')!.hasAttribute('disabled')).toBe(true);
    expect(body().querySelector('[aria-label="Sección Uno"]')).toBeNull();
  });

  it('empieza en vista y solo muestra los controles de edición tras pulsar Editar', async () => {
    mount(TemplateVisualBuilder, { props: { template, presets }, attachTo: document.body });
    expect(body().querySelector('[aria-label="Sección Uno"]')).toBeNull();
    expect(body().textContent).toContain('Uno');
    await click(byText('button', 'Editar'));
    expect(body().querySelector('[aria-label="Sección Uno"]')).not.toBeNull();
    expect(byText('button', 'Terminar edición')).toBeTruthy();
  });

  it('dibuja la tabla de identificación sin subtitular los campos sin nombre', async () => {
    const table: DocumentNode = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'FACULTAD: CIENCIAS' }] }] }] }] }] };
    const official: Template = { ...template, sections: [{ id: 's1', key: 'identificacion', title: 'Identificación Institucional', description: null, orientation: 'portrait', fields: [{ ...field('a', '', 'institucional'), content: table }] }] };
    mount(TemplateVisualBuilder, { props: { template: official }, attachTo: document.body });
    await click(byText('button', 'Editar'));
    await vi.advanceTimersByTimeAsync(50);
    expect(body().querySelector('[data-field="a"] table')?.textContent).toContain('FACULTAD: CIENCIAS');
    expect(body().querySelector<HTMLInputElement>('[aria-label="Nombre del campo Campo sin nombre"]')!.value).toBe('');
  });

  it('el título y los logos son fijos y no aparecen como campos editables', async () => {
    mount(TemplateVisualBuilder, { props: { template, logos: { institution: '/institution.png', faculty: '/faculty.png', institution_size: { width: 120, height: 40 }, faculty_size: { width: 120, height: 40 } } }, attachTo: document.body });
    expect(body().querySelector('h2')?.textContent).toBe('SÍLABO');
    expect(body().querySelectorAll('header img')).toHaveLength(2);
    expect(body().textContent).not.toContain('Editar título');
    expect(body().textContent).not.toContain('Cambiar logo');
  });
});
