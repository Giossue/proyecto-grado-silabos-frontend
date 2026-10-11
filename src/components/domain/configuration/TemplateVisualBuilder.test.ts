import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as templateApi from '@/api/template';
import { ApiError } from '@/api/client';
import type { TemplatePayload } from '@/api/template';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { emptyDocument, type FieldResponsible } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

vi.mock('@/api/template');

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
    vi.mocked(templateApi.importTemplateJson).mockResolvedValue({ message: 'ok' });
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

  const save = async () => { await click(byText('button', 'Guardar')); };
  const saved = () => vi.mocked(templateApi.importTemplateJson).mock.calls[0]![1] as { version: number; sections: Array<{ key: string; title: string; orientation: string; fields: Array<{ key: string; label: string; quien_llena: string; content: unknown }> }> };
  const sheetField = (wrapper: Awaited<ReturnType<typeof mountBuilder>>, index = 0) => (wrapper.findAllComponents({ name: 'TemplateSheetField' })[index]!.vm as unknown as { $: { setupState: { patch: (changes: unknown) => void; applyPreset: (preset: unknown) => void } } }).$.setupState;

  it('no guarda nada mientras se edita: solo al pulsar Guardar', async () => {
    await mountBuilder();
    await typeInto('Nombre del campo Primero', 'Primer campo');
    await vi.advanceTimersByTimeAsync(2000);
    expect(templateApi.importTemplateJson).not.toHaveBeenCalled();
    await save();
    expect(templateApi.importTemplateJson).toHaveBeenCalledTimes(1);
    expect(templateApi.importTemplateJson).toHaveBeenCalledWith('t1', expect.objectContaining({ version: 1 }));
    expect(saved().sections[0]!.fields[0]).toMatchObject({ key: 'f1', label: 'Primer campo', quien_llena: 'docente' });
  });

  it('Guardar queda deshabilitado mientras no haya cambios', async () => {
    await mountBuilder();
    expect(byText('button', 'Guardar')!.hasAttribute('disabled')).toBe(true);
    await typeInto('Nombre del campo Primero', 'X');
    expect(byText('button', 'Guardar')!.hasAttribute('disabled')).toBe(false);
  });

  it('cancelar descarta los cambios y vuelve a la vista', async () => {
    await mountBuilder();
    await typeInto('Nombre del campo Primero', 'Cambiado');
    await click(byText('button', 'Cancelar'));
    expect(templateApi.importTemplateJson).not.toHaveBeenCalled();
    expect(byText('button', 'Editar')).toBeTruthy();
    expect(body().textContent).not.toContain('Cambiado');
  });

  it('cambia quién llena el campo desde su menú y lo guarda con el botón', async () => {
    const wrapper = await mountBuilder();
    expect(body().querySelector('[aria-label="Quién llena el campo Primero"]')!.textContent).toContain('Docente');
    sheetField(wrapper).patch({ quien_llena: 'institucional' });
    await flushPromises();
    await save();
    expect(saved().sections[0]!.fields[0]!.quien_llena).toBe('institucional');
  });

  it('aplica una plantilla lista: pone su nombre, su contenido y quién lo llena', async () => {
    const wrapper = await mountBuilder();
    sheetField(wrapper).applyPreset(presets[0]);
    await flushPromises();
    await save();
    expect(saved().sections[0]!.fields[0]).toMatchObject({ label: 'Datos de identificación', quien_llena: 'institucional', content: presets[0]!.content });
  });

  it('agrega el campo vacío donde se pasó el cursor, sin llamar al servidor hasta guardar', async () => {
    await mountBuilder();
    const points = [...body().querySelectorAll<HTMLElement>('[data-insert-point] button')].filter((el) => el.textContent?.trim() === 'Agregar campo');
    await click(points[1]);
    expect(templateApi.importTemplateJson).not.toHaveBeenCalled();
    await save();
    expect(saved().sections[0]!.fields.map((item) => item.key)).toEqual(['f1', 'campo', 'f2']);
    expect(saved().sections[0]!.fields[1]).toMatchObject({ quien_llena: 'docente', label: '', content: emptyDocument() });
  });

  it('agrega una sección «Nueva sección» y avisa del cambio al guardar', async () => {
    const wrapper = await mountBuilder();
    await click(body().querySelector('[aria-label="Nueva sección"]'));
    await save();
    expect(saved().sections.map((item) => item.title)).toContain('Nueva sección');
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('renombra la sección y cambia su orientación', async () => {
    await mountBuilder();
    await typeInto('Sección Uno', 'Uno bis');
    await click(body().querySelector('[aria-label="Orientación de la sección Uno bis"]'));
    await save();
    expect(saved().sections[0]).toMatchObject({ title: 'Uno bis', orientation: 'landscape' });
  });

  it('reordena secciones y campos subiendo y bajando', async () => {
    await mountBuilder();
    await click(body().querySelector('[aria-label="Subir el campo Segundo"]'));
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Subir el campo Segundo"]')!.disabled).toBe(true);
    await click(body().querySelector('[aria-label="Bajar la sección Uno"]'));
    expect(body().querySelector<HTMLButtonElement>('[aria-label="Subir la sección Uno"]')!.disabled).toBe(false);
    await save();
    expect(saved().sections.map((item) => item.key)).toEqual(['dos', 'uno']);
    expect(saved().sections[1]!.fields.map((item) => item.key)).toEqual(['f2', 'f1']);
  });

  it('elimina campos y secciones solo tras confirmar', async () => {
    await mountBuilder();
    await click(body().querySelector('[aria-label="Eliminar el campo Primero"]'));
    expect(body().querySelector('[aria-label="Nombre del campo Primero"]')).not.toBeNull();
    await click(byText('button', 'Eliminar'));
    expect(body().querySelector('[aria-label="Nombre del campo Primero"]')).toBeNull();
    await click(body().querySelector('[aria-label="Eliminar la sección Uno"]'));
    expect(body().textContent).toContain('con sus 1 campos');
    await click(byText('button', 'Eliminar'));
    await save();
    expect(saved().sections.map((item) => item.key)).toEqual(['dos']);
  });

  it('muestra el mensaje del servidor cuando no se pudo guardar y sigue en edición', async () => {
    vi.mocked(templateApi.importTemplateJson).mockRejectedValue(new ApiError('Hay un proceso abierto: pause la convocatoria.', 409));
    await mountBuilder();
    await typeInto('Nombre del campo Primero', 'X');
    await save();
    expect(body().textContent).toContain('Hay un proceso abierto: pause la convocatoria.');
    expect(byText('button', 'Guardar')).toBeTruthy();
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
    expect(byText('button', 'Guardar')).toBeTruthy();
    expect(byText('button', 'Cancelar')).toBeTruthy();
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
