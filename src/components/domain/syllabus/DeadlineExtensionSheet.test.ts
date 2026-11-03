import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { extendProcessDeadline, type SyllabusProcess } from '@/api/processes';
import DatePicker from '@/components/DatePicker.vue';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';

vi.mock('@/api/processes', () => ({
  extendProcessDeadline: vi.fn(),
}));

const process = (extensionsUsed = 0): SyllabusProcess => ({
  id: 'process-1',
  name: 'Octubre-Febrero 2026-2027',
  state: 'abierto',
  template: 'Plantilla institucional de sílabo',
  period_id: 'period-1',
  period_name: 'Octubre-Febrero 2026-2027',
  starts_at: '2026-10-01',
  due_at: '2026-11-20',
  convocations_count: 1,
  configurable: false,
  deletable: true,
  extensions_used: extensionsUsed,
  extensions_max: 2,
  extension_limit_on: '2027-02-26',
  extension_block_reason: null,
});

const mountSheet = (value = process()) => mount(DeadlineExtensionSheet, {
  attachTo: document.body,
  props: { process: value, open: true },
});

// Como reka-ui: el contenido sigue montado mientras el panel se desliza al cerrar.
const slidingSheet = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-sheet :data-state="open ? \'open\' : \'closed\'"><slot :close="() => $emit(\'update:open\', false)" /></div>',
});

describe('DeadlineExtensionSheet', () => {
  beforeEach(() => {
    vi.mocked(extendProcessDeadline).mockReset().mockResolvedValue({ message: 'Plazo prorrogado.' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('extends only the delivery deadline without asking for a stage', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.body.textContent).toContain('Nueva fecha límite de entrega');
    expect(document.body.textContent).not.toContain('Etapa');

    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await flushPromises();
    expect(document.body.querySelector('#extension-reason')).toBeNull();

    document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(extendProcessDeadline).toHaveBeenCalledWith('process-1', { due_at: '2027-02-15' });
    expect(wrapper.emitted('saved')).toEqual([['Plazo prorrogado.']]);
    wrapper.unmount();
  });

  it('al guardar cierra sin borrar la fecha, y la borra al volver a abrir', async () => {
    const wrapper = mount(DeadlineExtensionSheet, { attachTo: document.body, props: { process: process(), open: true }, global: { stubs: { FormSheet: slidingSheet } } });
    await flushPromises();
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await flushPromises();
    document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(wrapper.getComponent(slidingSheet).attributes('data-state')).toBe('closed');
    expect(wrapper.findComponent(DatePicker).props('modelValue')).toBe('2027-02-15');
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(wrapper.findComponent(DatePicker).props('modelValue')).toBe('');
    wrapper.unmount();
  });

  it('dice qué prórroga es de las dos', async () => {
    const first = mountSheet(process(0));
    await flushPromises();
    expect(document.body.textContent).toContain('Prórroga 1 de 2');
    first.unmount();
    document.body.innerHTML = '';

    const second = mountSheet(process(1));
    await flushPromises();
    expect(document.body.textContent).toContain('Prórroga 2 de 2');
    second.unmount();
  });

  it('no deja elegir después del último día de clases y lo dice', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(wrapper.findComponent(DatePicker).props('maxValue')).toBe('2027-02-26');
    expect(document.body.textContent).toContain('Hasta el último día de clases: 26 feb 2027');
    wrapper.unmount();
  });
});
