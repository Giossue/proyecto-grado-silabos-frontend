import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import * as templateApi from '@/api/template';
import TemplateJsonDialog from '@/components/domain/configuration/TemplateJsonDialog.vue';

vi.mock('@/api/template', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/template')>()),
  getTemplateJson: vi.fn(),
  importTemplateJson: vi.fn(),
}));

const sample = { version: 1, sections: [{ key: 'uno', title: 'Uno', fields: [] }] };
const mountDialog = async (locked = false) => {
  const wrapper = mount(TemplateJsonDialog, { props: { templateId: 't1', locked, open: true }, attachTo: document.body });
  await flushPromises();
  return wrapper;
};
const area = () => document.body.querySelector<HTMLTextAreaElement>('[aria-label="JSON de la plantilla"]')!;
const setText = async (value: string) => {
  area().value = value;
  area().dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};
const apply = () => [...document.body.querySelectorAll('button')].find((button) => button.textContent?.includes('Aplicar y reemplazar'))!;

describe('TemplateJsonDialog', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
    vi.mocked(templateApi.getTemplateJson).mockResolvedValue(sample);
    vi.mocked(templateApi.importTemplateJson).mockResolvedValue({ message: 'ok' });
  });

  it('carga la plantilla actual como JSON con sangría', async () => {
    await mountDialog();
    expect(templateApi.getTemplateJson).toHaveBeenCalledWith('t1');
    expect(area().value).toBe(JSON.stringify(sample, null, 2));
  });

  it('no envía nada si el JSON tiene un error de sintaxis y lo explica', async () => {
    await mountDialog();
    await setText('{ "version": ');
    apply().click();
    await flushPromises();
    expect(templateApi.importTemplateJson).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('El JSON no es válido');
  });

  it('aplica el JSON editado, avisa que se importó y cierra', async () => {
    const wrapper = await mountDialog();
    const edited = { ...sample, sections: [{ key: 'dos', title: 'Dos', fields: [] }] };
    await setText(JSON.stringify(edited));
    apply().click();
    await flushPromises();
    expect(templateApi.importTemplateJson).toHaveBeenCalledWith('t1', edited);
    expect(wrapper.emitted('imported')).toHaveLength(1);
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
  });

  it('muestra cada error del servidor con su camino y no cierra', async () => {
    vi.mocked(templateApi.importTemplateJson).mockRejectedValue(new ApiError('Datos inválidos', 422, { 'sections.0.fields.1.key': ['La clave está repetida'], 'sections.2.orientation': ['No válida'] }));
    const wrapper = await mountDialog();
    apply().click();
    await flushPromises();
    expect(document.body.textContent).toContain('sections.0.fields.1.key: La clave está repetida');
    expect(document.body.textContent).toContain('sections.2.orientation: No válida');
    expect(document.body.textContent).toContain('no se cambió nada');
    expect(wrapper.emitted('imported')).toBeUndefined();
  });

  it('bloquea la edición con un proceso abierto', async () => {
    await mountDialog(true);
    expect(area().disabled).toBe(true);
    expect(apply().disabled).toBe(true);
  });
});
