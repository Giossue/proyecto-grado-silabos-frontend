import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { getAiChat, sendAiChatMessage, type AiChat, type AiChatMessage } from '@/api/syllabi';
import SyllabusUnitAssistant from './SyllabusUnitAssistant.vue';

vi.mock('@/api/syllabi', () => ({ getAiChat: vi.fn(), sendAiChatMessage: vi.fn() }));
vi.mock('@/components/domain/ai/avatar/useAvatarController', async () => {
  const { ref } = await import('vue');
  return { useAvatarController: () => ({ state: ref({}), applyAgentHint: vi.fn() }) };
});
const empty: AiChat = { conversation: null, available: true, suggested_questions: ['Propón actividades para la unidad 1.'] };
const assistant: AiChatMessage = { id: 'answer-1', role: 'asistente', status: 'completado', content: 'Unidad: pruebas de integración.', draft_version: 1, error: null, created_at: '2026-09-27T10:00:00Z', citations: [{ id: 'citation-1', type: 'contexto_academico', field_id: null, source_id: null, label: 'Resultados de aprendizaje · Malla', excerpt: 'Evalúa la calidad del software.' }] };
const conversation = (message: AiChatMessage): AiChat => ({ ...empty, conversation: { id: 'chat-1', hidden: false, messages: [message] } });
const wrappers: Array<ReturnType<typeof mount>> = [];
const render = () => {
  const wrapper = mount(SyllabusUnitAssistant, {
    props: { syllabusId: 'syllabus-1', enabled: true, saving: false },
    global: { stubs: { RobotAvatar: true, Conversation: { template: '<section><slot /></section>' }, ConversationContent: { template: '<div><slot /></div>' }, ConversationScrollButton: true } },
  });
  wrappers.push(wrapper);
  return wrapper;
};
beforeEach(() => { vi.resetAllMocks(); vi.mocked(getAiChat).mockResolvedValue(empty); vi.mocked(sendAiChatMessage).mockResolvedValue({ message: 'Consulta recibida', assistant_message_id: 'pending-1' }); });
afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); vi.useRealTimers(); });

describe('SyllabusUnitAssistant', () => {
  it('anuncia la carga de la conversación y conserva el formulario hasta recibir el contexto', async () => {
    let finish!: (value: AiChat) => void;
    vi.mocked(getAiChat).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const wrapper = render();

    expect(wrapper.get('[aria-label="Cargando conversación"]').attributes('aria-busy')).toBe('true');
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();

    finish(empty);
    await flushPromises();

    expect(wrapper.find('[aria-label="Cargando conversación"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Comienza una conversación');
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined();
  });

  it('consulta sobre unidades sin lanzar revisión ni modificar el sílabo, y presenta la evidencia de la respuesta', async () => {
    vi.useFakeTimers();
    vi.mocked(getAiChat).mockResolvedValueOnce(empty).mockResolvedValueOnce(conversation({ ...assistant, status: 'pendiente', content: '', citations: [] })).mockResolvedValueOnce(conversation(assistant));
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain('Asistente de unidades');
    expect(wrapper.text()).not.toContain('datos curriculares confirmados');
    await wrapper.get('textarea').setValue('  Ayúdame con la unidad de pruebas.  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(sendAiChatMessage).toHaveBeenCalledWith('syllabus-1', 'Ayúdame con la unidad de pruebas.', expect.any(String));
    expect(wrapper.text()).toContain('Preparando una propuesta');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await vi.advanceTimersByTimeAsync(2500);
    await flushPromises();
    expect(wrapper.text()).toContain('Unidad: pruebas de integración.');
    const evidence = wrapper.findAll('button').find((button) => button.text().includes('Malla'))!;
    expect(evidence.attributes('aria-expanded')).toBe('false');
    await evidence.trigger('click');
    expect(wrapper.get('blockquote').text()).toBe('Evalúa la calidad del software.');
    expect(wrapper.text()).not.toContain('Copiar respuesta');
    expect(wrapper.text()).not.toContain('Revisar con IA');
    expect(wrapper.text()).not.toContain('Aplicar recomendación');
  });

  it('espera el autoguardado y preserva la consulta cuando falla el envío', async () => {
    vi.mocked(sendAiChatMessage).mockRejectedValueOnce(new ApiError('El servicio no está disponible.', 503));
    const wrapper = render();
    await flushPromises();
    await wrapper.get('textarea').setValue('Propón actividades.');
    await wrapper.setProps({ saving: true });
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(sendAiChatMessage).not.toHaveBeenCalled();
    await wrapper.setProps({ saving: false });
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('El servicio no está disponible.');
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Propón actividades.');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined();
  });

  it('mantiene la conversación legible si el servicio está deshabilitado', async () => {
    vi.mocked(getAiChat).mockResolvedValue({ ...conversation(assistant), available: false });
    const wrapper = render();
    await flushPromises();
    expect(wrapper.text()).toContain(assistant.content);
    expect(wrapper.text()).toContain('Puedes continuar elaborando tu sílabo');
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('descarta una respuesta tardía al cambiar de sílabo', async () => {
    let finish!: (value: AiChat) => void;
    vi.mocked(getAiChat).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(empty);
    const wrapper = render();
    await wrapper.setProps({ syllabusId: 'syllabus-2' });
    await flushPromises();
    finish(conversation(assistant));
    await flushPromises();
    expect(getAiChat).toHaveBeenLastCalledWith('syllabus-2');
    expect(wrapper.text()).not.toContain(assistant.content);
  });
});
