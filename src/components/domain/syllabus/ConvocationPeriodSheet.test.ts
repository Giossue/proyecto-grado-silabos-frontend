import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DatePicker from '@/components/DatePicker.vue';
import ConvocationPeriodSheet from '@/components/domain/syllabus/ConvocationPeriodSheet.vue';

const api = vi.hoisted(() => ({ createAcademicRecord: vi.fn(), createProcess: vi.fn() }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), createAcademicRecord: api.createAcademicRecord }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), createProcess: api.createProcess }));

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

const mountSheet = async () => {
  const wrapper = mount(ConvocationPeriodSheet, { attachTo: document.body, props: { open: true } });
  await flushPromises();
  return wrapper;
};

describe('ConvocationPeriodSheet', () => {
  it('pide las fechas del periodo y deja opcionales las de la convocatoria', async () => {
    const wrapper = await mountSheet();
    const pickers = wrapper.findAllComponents(DatePicker);
    expect(pickers).toHaveLength(4);
    expect(pickers.map((picker) => picker.props('required'))).toEqual([true, true, false, false]);
    expect(pickers.every((picker) => picker.props('modelValue') === '')).toBe(true);
    wrapper.unmount();
  });

  it('solo crea el periodo cuando no se indican fechas de elaboración', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    const wrapper = await mountSheet();
    const [starts, ends] = wrapper.findAllComponents(DatePicker);
    starts.vm.$emit('update:modelValue', '2026-10-05');
    ends.vm.$emit('update:modelValue', '2027-02-26');
    await document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();

    expect(api.createAcademicRecord).toHaveBeenCalledWith('periodo', { starts_on: '2026-10-05', ends_on: '2027-02-26' });
    expect(api.createProcess).not.toHaveBeenCalled();
    expect(wrapper.emitted('saved')?.[0]).toEqual(['Registro institucional creado.']);
    wrapper.unmount();
  });

  it('crea el periodo y abre la convocatoria con el id devuelto', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    api.createProcess.mockResolvedValue({ message: 'Convocatoria institucional abierta.' });
    const wrapper = await mountSheet();
    const [starts, ends, opens, due] = wrapper.findAllComponents(DatePicker);
    starts.vm.$emit('update:modelValue', '2026-10-05');
    ends.vm.$emit('update:modelValue', '2027-02-26');
    opens.vm.$emit('update:modelValue', '2026-10-06');
    due.vm.$emit('update:modelValue', '2026-10-30');
    await document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();

    expect(api.createProcess).toHaveBeenCalledWith({ period_id: 'p1', starts_at: '2026-10-06', due_at: '2026-10-30' });
    expect(wrapper.emitted('saved')?.[0]).toEqual(['Convocatoria institucional abierta.']);
    wrapper.unmount();
  });
});
