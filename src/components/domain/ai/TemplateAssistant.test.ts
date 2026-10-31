import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTemplateAssistant, getTemplateAssistant, sendTemplateAssistantMessage, type TemplateAssistantChat, type TemplateAssistantMessage } from '@/api/templateAssistant';
import TemplateAssistant from './TemplateAssistant.vue';

vi.mock('@/api/templateAssistant', () => ({ getTemplateAssistant: vi.fn(), sendTemplateAssistantMessage: vi.fn(), clearTemplateAssistant: vi.fn() }));
vi.mock('@/components/domain/ai/avatar/useAvatarController', async () => {
  const { ref } = await import('vue');
  return { useAvatarController: () => ({ state: ref({}), applyAgentHint: vi.fn() }) };
});

const empty: TemplateAssistantChat = { available: true, locked: false, suggestions: ['¿Qué campos llena Coordinación?'], messages: [] };
const question: TemplateAssistantMessage = { id: 'q-1', role: 'usuario', status: 'completado', result: null, content: 'Agrega Competencias', error: null, created_at: '2026-10-31T10:00:00Z', proposal: null };
const answer: TemplateAssistantMessage = { id: 'a-1', role: 'asistente', status: 'completado', result: 'propuesta', content: 'Propongo **Competencias**.', error: null, created_at: '2026-10-31T10:00:05Z', proposal: { id: 'p-1', status: 'pendiente', changes: ['Nuevo campo «Competencias» en «4. Resultados de aprendizaje».'], draft_version: 'sesion:3' } };
const chat = (...messages: TemplateAssistantMessage[]): TemplateAssistantChat => ({ ...empty, messages });
const draft = { sections: [], version: 'sesion:3' };
const wrappers: Array<ReturnType<typeof mount>> = [];
const render = (props: { refresh?: number; draftVersion?: string; busy?: string | null } = {}) => {
  const wrapper = mount(TemplateAssistant, {
    props: { refresh: 0, draftVersion: 'sesion:3', snapshot: () => draft, busy: null, ...props },
    global: { stubs: { RobotAvatar: true, Conversation: { template: '<section><slot /></section>' }, ConversationContent: { template: '<div><slot /></div>' }, ConversationScrollButton: true } },
  });
  wrappers.push(wrapper);
  return wrapper;
};
const button = (wrapper: ReturnType<typeof render>, text: string) => wrapper.findAll('button').find((item) => item.text() === text);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getTemplateAssistant).mockResolvedValue(empty);
  vi.mocked(sendTemplateAssistantMessage).mockResolvedValue({ message: 'El pedido quedó registrado.', assistant_message_id: 'a-1' });
  vi.mocked(clearTemplateAssistant).mockResolvedValue({ message: 'Nuevo chat iniciado.' });
});
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.useRealTimers(); });

describe('TemplateAssistant', () => {
  it('envía el pedido con el borrador del editor hasta recibir la propuesta', async () => {
    vi.useFakeTimers();
    vi.mocked(getTemplateAssistant).mockResolvedValueOnce(empty).mockResolvedValueOnce(chat(question, { ...answer, status: 'pendiente', content: '', proposal: null })).mockResolvedValueOnce(chat(question, answer));
    const wrapper = render();
    await flushPromises();

    expect(wrapper.text()).toContain('Pida un cambio a la plantilla');
    await button(wrapper, '¿Qué campos llena Coordinación?')!.trigger('click');
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('¿Qué campos llena Coordinación?');
    await wrapper.get('textarea').setValue('  Agrega Competencias  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sendTemplateAssistantMessage).toHaveBeenCalledWith('Agrega Competencias', draft, expect.any(String));
    expect(wrapper.text()).toContain('Preparando la propuesta');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await vi.advanceTimersByTimeAsync(2500);
    await flushPromises();

    expect(wrapper.find('strong').text()).toBe('Competencias');
    expect(wrapper.get('[data-proposal]').text()).toContain('Nuevo campo «Competencias» en «4. Resultados de aprendizaje»');
    expect(wrapper.get('[data-proposal]').text()).not.toContain('aprendizaje».');
    expect(wrapper.text()).toContain('Los cambios aplicados se guardan con «Guardar»');
  });

  it('aplica o descarta la propuesta pendiente del borrador actual', async () => {
    vi.mocked(getTemplateAssistant).mockResolvedValue(chat(question, answer));
    const wrapper = render();
    await flushPromises();

    await button(wrapper, 'Aplicar')!.trigger('click');
    await button(wrapper, 'Descartar')!.trigger('click');
    expect(wrapper.emitted('apply')?.[0]).toEqual(['p-1']);
    expect(wrapper.emitted('discard')?.[0]).toEqual(['p-1']);

    await wrapper.setProps({ busy: 'p-1' });
    expect(button(wrapper, 'Aplicar')!.attributes('disabled')).toBeDefined();
  });

  it('marca como vencida la propuesta si el borrador cambió después del pedido', async () => {
    vi.mocked(getTemplateAssistant).mockResolvedValue(chat(question, answer));
    const wrapper = render({ draftVersion: 'sesion:4' });
    await flushPromises();

    expect(wrapper.get('[data-proposal]').text()).toContain('Vencida: el borrador cambió');
    expect(button(wrapper, 'Aplicar')).toBeUndefined();
  });

  it('muestra el estado de las propuestas que ya no están pendientes', async () => {
    vi.mocked(getTemplateAssistant).mockResolvedValue(chat(
      { ...answer, id: 'a-1', proposal: { id: 'p-1', status: 'reemplazada', changes: ['Uno.'], draft_version: 'sesion:3' } },
      { ...answer, id: 'a-2', proposal: { id: 'p-2', status: 'descartada', changes: ['Dos.'], draft_version: 'sesion:3' } },
      { ...answer, id: 'a-3', proposal: { id: 'p-3', status: 'aplicada', changes: ['Tres.'], draft_version: 'sesion:3' } },
    ));
    const wrapper = render();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('Reemplazada por otra propuesta');
    expect(text).toContain('Descartada');
    expect(text).toContain('Aplicada');
    expect(wrapper.findAll('[data-proposal] button')).toHaveLength(0);
  });

  it('vuelve a cargar cuando la página lo pide y empieza un chat nuevo', async () => {
    vi.mocked(getTemplateAssistant).mockResolvedValue(chat(question, answer));
    const wrapper = render();
    await flushPromises();
    await wrapper.setProps({ refresh: 1 });
    await flushPromises();
    expect(getTemplateAssistant).toHaveBeenCalledTimes(2);

    vi.mocked(getTemplateAssistant).mockResolvedValue(empty);
    await wrapper.findAll('button').find((item) => item.text().includes('Nuevo chat'))!.trigger('click');
    await flushPromises();

    expect(clearTemplateAssistant).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Pida un cambio a la plantilla');
  });

  it('avisa si no está disponible', async () => {
    vi.mocked(getTemplateAssistant).mockResolvedValue({ ...empty, available: false });
    const wrapper = render();
    await flushPromises();

    expect(wrapper.text()).toContain('El asistente no está disponible por ahora');
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
  });
});
