import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as templateApi from '@/api/template';
import { TooltipProvider } from '@/components/ui/tooltip';
import TemplateHistorySheet from '@/components/domain/configuration/TemplateHistorySheet.vue';

vi.mock('@/api/template', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/template')>()),
  getTemplateVersions: vi.fn(),
  getTemplateVersion: vi.fn(),
  getTemplateVersionComparison: vi.fn(),
}));

const versions = [
  { id: 'v2', number: 2, saved_at: '2026-11-16T15:30:00Z', saved_by: 'Ana Pérez', sections: 3, fields: 7, current: true },
  { id: 'v1', number: 1, saved_at: '2026-11-10T13:00:00Z', saved_by: 'Sistema', sections: 2, fields: 5, current: false },
];
const draft = { title: 'Sílabo', layout: { margin_cm: 1.5, title_font_size: 14, section_font_size: 11, body_font_size: 11 }, sections: [] };

const mountSheet = async (locked: string | null = null) => {
  const wrapper = mount({
    components: { TemplateHistorySheet, TooltipProvider },
    props: ['locked'],
    emits: ['restore'],
    template: '<TooltipProvider><TemplateHistorySheet template-id="t1" :locked="locked" :open="true" @restore="(...args) => $emit(\'restore\', ...args)" /></TooltipProvider>',
  }, { props: { locked }, attachTo: document.body });
  await flushPromises();
  return wrapper;
};
const body = () => document.body.textContent ?? '';
const item = (number: number) => document.body.querySelector<HTMLElement>(`[data-version="${number}"]`)!;
const button = (root: ParentNode, label: string) => [...root.querySelectorAll<HTMLButtonElement>('button')].find((element) => element.textContent?.trim() === label)!;

describe('TemplateHistorySheet', () => {
  enableAutoUnmount(afterEach);
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';
    vi.mocked(templateApi.getTemplateVersions).mockResolvedValue({ versions });
    vi.mocked(templateApi.getTemplateVersion).mockResolvedValue({ ...versions[1]!, json: {}, draft });
    vi.mocked(templateApi.getTemplateVersionComparison).mockResolvedValue({ changes: ['Sección agregada: «Anexos»', 'Contenido cambiado: «Descripción»'] });
  });

  it('lista cada versión con su número, fecha y quién la guardó, y marca la actual', async () => {
    await mountSheet();

    expect(templateApi.getTemplateVersions).toHaveBeenCalledWith('t1');
    expect(item(2).textContent).toContain('Versión 2');
    expect(item(2).textContent).toContain('Ana Pérez');
    expect(item(2).textContent).toContain('Actual');
    expect(item(2).textContent).toContain('2026');
    expect(item(1).textContent).toContain('Sistema');
    expect(item(1).textContent).not.toContain('Actual');
  });

  it('«Ver cambios» muestra en frases cortas qué cambió desde esa versión', async () => {
    await mountSheet();

    button(item(1), 'Ver cambios').click();
    await flushPromises();

    expect(templateApi.getTemplateVersionComparison).toHaveBeenCalledWith('t1', 'v1');
    expect(item(1).textContent).toContain('Sección agregada: «Anexos»');
    expect(item(1).textContent).toContain('Contenido cambiado: «Descripción»');
  });

  it('dice que no hay diferencias cuando la versión es igual a la actual', async () => {
    vi.mocked(templateApi.getTemplateVersionComparison).mockResolvedValue({ changes: [] });
    await mountSheet();

    button(item(2), 'Ver cambios').click();
    await flushPromises();

    expect(item(2).textContent).toContain('Igual a la plantilla actual');
  });

  it('«Restaurar» pide confirmar, explica que se carga en el editor y entrega el borrador', async () => {
    const wrapper = await mountSheet();

    button(item(1), 'Restaurar').click();
    await flushPromises();
    expect(body()).toContain('Se carga en el editor');
    expect(body()).toContain('Guardar');
    expect(templateApi.getTemplateVersion).not.toHaveBeenCalled();

    button(document.body.querySelector('[role="alertdialog"], [role="dialog"]:last-of-type')!, 'Cargar en el editor').click();
    await flushPromises();

    expect(templateApi.getTemplateVersion).toHaveBeenCalledWith('t1', 'v1');
    expect(wrapper.emitted('restore')?.[0]).toEqual([draft, 1]);
  });

  it('no deja restaurar la versión actual', async () => {
    await mountSheet();

    expect(button(item(2), 'Restaurar').disabled).toBe(true);
  });

  it('con la plantilla bloqueada no deja restaurar y dice por qué', async () => {
    await mountSheet('Hay un proceso abierto');

    expect(button(item(1), 'Restaurar').disabled).toBe(true);
    expect(body()).toContain('Hay un proceso abierto');
  });
});
