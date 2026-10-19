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
const field = (id: string, label: string, quien_llena: FieldResponsible = 'docente') => ({ id, key: id, label, quien_llena, content: emptyDocument() });
const template: Template = {
  id: 't1', name: 'Plantilla', description: null, titleBlock: { text: 'SÍLABO' },
  sections: [
    { id: 's1', key: 'uno', title: 'Uno', orientation: 'portrait', fields: [field('f1', 'Primero'), field('f2', 'Segundo', 'coordinacion')] },
    { id: 's2', key: 'dos', title: 'Dos', orientation: 'portrait', fields: [] },
  ],
};

const presets = [
  { key: 'identificacion' as const, field_key: 'asignatura', label: 'Datos de identificación', quien_llena: 'institucional' as FieldResponsible, content: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dato' }] }] }] }] }] } as DocumentNode },
  { key: 'planificacion' as const, field_key: 'unidades', label: 'Unidades', quien_llena: 'docente' as FieldResponsible, content: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 1, rowspan: 1 }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Dato' }] }] }] }] }] } as DocumentNode },
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

  it('aplica márgenes y tamaños del diseño a la hoja y los guarda con la plantilla', async () => {
    const options = { margins: [{ value: 1.5, label: '1,5 cm' }, { value: 2.5, label: '2,5 cm' }], title_sizes: [{ value: 14, label: '14 pt' }], section_sizes: [{ value: 11, label: '11 pt' }], body_sizes: [{ value: 11, label: '11 pt' }, { value: 12, label: '12 pt' }] };
    const designed = { ...template, layout: { margin_cm: 1.5, title_font_size: 14, section_font_size: 11, body_font_size: 11 }, layoutOptions: options };
    const wrapper = mount(TemplateVisualBuilder, { props: { template: designed, presets }, attachTo: document.body });
    expect(body().querySelector<HTMLElement>('[data-sheet]')!.style.getPropertyValue('--document-margin')).toBe('1.5cm');
    await click(byText('button', 'Editar'));
    expect(byText('button', 'Diseño')).toBeTruthy();
    const state = (wrapper.vm as unknown as { $: { setupState: { setLayout: (key: string, value: unknown) => void } } }).$.setupState;
    state.setLayout('margin_cm', '2.5');
    state.setLayout('body_font_size', '12');
    await flushPromises();
    expect(body().querySelector<HTMLElement>('[data-sheet]')!.style.getPropertyValue('--document-margin')).toBe('2.5cm');
    expect(body().querySelector<HTMLElement>('[data-sheet]')!.style.getPropertyValue('--document-body-size')).toBe('12pt');
    await save();
    expect((saved() as unknown as { layout: unknown }).layout).toEqual({ margin_cm: 2.5, title_font_size: 14, section_font_size: 11, body_font_size: 12 });
  });

  it('Guardar queda deshabilitado mientras no haya cambios', async () => {
    await mountBuilder();
    expect(byText('button', 'Guardar')!.hasAttribute('disabled')).toBe(true);
    await typeInto('Nombre del campo Primero', 'X');
    expect(byText('button', 'Guardar')!.hasAttribute('disabled')).toBe(false);
  });

  it('avisa que hay cambios sin guardar y deja de avisar al cancelar', async () => {
    const wrapper = await mountBuilder();
    expect(body().textContent).not.toContain('Sin guardar');
    await typeInto('Nombre del campo Primero', 'Cambiado');
    expect(body().textContent).toContain('Sin guardar');
    expect(wrapper.emitted('dirty')!.at(-1)).toEqual([true]);
    await click(byText('button', 'Cancelar'));
    expect(wrapper.emitted('dirty')!.at(-1)).toEqual([false]);
  });

  it('Ctrl+S guarda mientras se edita, pero solo si hay cambios', async () => {
    await mountBuilder();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    await flushPromises();
    expect(templateApi.importTemplateJson).not.toHaveBeenCalled();
    await typeInto('Nombre del campo Primero', 'Cambiado');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    await flushPromises();
    expect(templateApi.importTemplateJson).toHaveBeenCalledTimes(1);
  });

  it('permite cambiar el título del documento y lo envía al guardar', async () => {
    await mountBuilder();
    await typeInto('Título del documento', 'SÍLABO UEB');
    await save();
    expect(templateApi.importTemplateJson).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: 'SÍLABO UEB' }));
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

  it('aplica una plantilla lista: solo copia su contenido y quién lo llena al campo', async () => {
    const wrapper = await mountBuilder();
    sheetField(wrapper).applyPreset(presets[0]);
    await flushPromises();
    await save();
    expect(saved().sections[0]!.fields[0]).toMatchObject({ key: 'f1', label: 'Primero', quien_llena: 'institucional' });
    expect(JSON.stringify(saved().sections[0]!.fields[0]!.content)).toContain('Dato');
  });

  it('el campo con contenido de plantilla se sigue editando como cualquier otro', async () => {
    const wrapper = await mountBuilder();
    sheetField(wrapper).applyPreset(presets[0]);
    await flushPromises();
    expect(body().querySelector<HTMLInputElement>('[aria-label="Nombre del campo Primero"]')!.disabled).toBe(false);
    expect(body().querySelector('[aria-label="Ayuda del campo Primero"]')).toBeNull();
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
    const official: Template = { ...template, sections: [{ id: 's1', key: 'identificacion', title: 'Identificación Institucional', orientation: 'portrait', fields: [{ ...field('a', '', 'institucional'), content: table }] }] };
    mount(TemplateVisualBuilder, { props: { template: official }, attachTo: document.body });
    await click(byText('button', 'Editar'));
    await vi.advanceTimersByTimeAsync(50);
    expect(body().querySelector('[data-field="a"] table')?.textContent).toContain('FACULTAD: CIENCIAS');
    expect(body().querySelector<HTMLInputElement>('[aria-label="Nombre del campo Campo sin nombre"]')!.value).toBe('');
  });

  it('en la vista muestra el título y los logos sin controles de edición', async () => {
    mount(TemplateVisualBuilder, { props: { template, logos: { institution: '/institution.png', faculty: '/faculty.png', institution_size: { width: 120, height: 40 }, faculty_size: { width: 120, height: 40 } } }, attachTo: document.body });
    expect(body().querySelector('h2')?.textContent).toBe('SÍLABO');
    expect(body().querySelectorAll('header img')).toHaveLength(2);
    expect(body().textContent).not.toContain('Editar título');
    expect(body().textContent).not.toContain('Cambiar logo');
  });
});
