import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';

vi.mock('@/api/convocations', () => ({ transitionConvocation: vi.fn() }));

afterEach(() => { document.body.innerHTML = ''; });

describe('ConvocationActions', () => {
  it('al pausar avisa que tampoco se revisan los sílabos enviados', async () => {
    const wrapper = mount(ConvocationActions, {
      props: { convocation: { process_id: 'p-1', period: '2026-2027', convocation_id: 'c-1', can_open: false, state: 'abierta', process_open: true } },
      attachTo: document.body,
    });

    await wrapper.get('button').trigger('click');
    await flushPromises();

    const text = document.body.textContent ?? '';
    expect(text).toContain('Coordinación y Biblioteca no podrán revisar sus sílabos');
    expect(text).not.toContain('la revisión de lo enviado continúa');
    wrapper.unmount();
  });
});
