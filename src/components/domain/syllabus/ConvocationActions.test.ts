import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';

vi.mock('@/api/convocations', () => ({ transitionConvocation: vi.fn() }));

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers(); });

const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});
const openingDialog = defineComponent({ name: 'ConvocationOpeningDialog', emits: ['opened'], template: '<div />' });
const stubs = { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough, DialogClose: passthrough, ConvocationOpeningDialog: openingDialog };

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

  it('al cerrar, el modal de pausar sigue mostrando su contenido mientras se desvanece', async () => {
    const wrapper = mount(ConvocationActions, {
      props: { convocation: { process_id: 'p-1', period: '2026-2027', convocation_id: 'c-1', can_open: false, state: 'abierta', process_open: true } },
      global: { stubs },
    });

    await wrapper.get('button').trigger('click');
    const modal = wrapper.getComponent(fadingDialog);
    modal.vm.$emit('update:open', false);
    await flushPromises();

    expect(modal.attributes('data-state')).toBe('closed');
    expect(modal.text()).toContain('Pausar la convocatoria');
  });

  it('avisa que abrió la convocatoria cuando el modal de apertura terminó de cerrarse', async () => {
    vi.useFakeTimers();
    const wrapper = mount(ConvocationActions, {
      props: { convocation: { process_id: 'p-1', period: '2026-2027', convocation_id: null, can_open: true, state: null, process_open: true } },
      global: { stubs },
    });

    wrapper.getComponent(openingDialog).vm.$emit('opened', 'Convocatoria abierta.', 'c-1');
    await flushPromises();
    expect(wrapper.emitted('changed')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(wrapper.emitted('changed')).toEqual([['Convocatoria abierta.']]);
  });
});
