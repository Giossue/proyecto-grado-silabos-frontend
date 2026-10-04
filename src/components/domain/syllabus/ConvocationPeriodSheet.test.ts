import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
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
  it('exige las cuatro fechas y las deja vacías al abrir', async () => {
    const wrapper = await mountSheet();
    const pickers = wrapper.findAllComponents(DatePicker);
    expect(pickers).toHaveLength(4);
    expect(pickers.every((picker) => picker.props('required'))).toBe(true);
    expect(pickers.every((picker) => picker.props('modelValue') === '')).toBe(true);
    wrapper.unmount();
  });

  it('si la apertura falla, el reintento no vuelve a crear el periodo', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    api.createProcess.mockRejectedValueOnce(new ApiError('Error', 422, { process: ['Ya hay una convocatoria en curso.'] })).mockResolvedValueOnce({ message: 'Convocatoria institucional abierta.' });
    const wrapper = await mountSheet();
    const [starts, ends, opens, due] = wrapper.findAllComponents(DatePicker);
    starts.vm.$emit('update:modelValue', '2026-10-05');
    ends.vm.$emit('update:modelValue', '2027-02-26');
    opens.vm.$emit('update:modelValue', '2026-10-06');
    due.vm.$emit('update:modelValue', '2026-10-30');
    const form = document.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(wrapper.text()).toContain('El periodo ya quedó creado');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();

    expect(api.createAcademicRecord).toHaveBeenCalledTimes(1);
    expect(api.createProcess).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('saved')?.[0]).toEqual(['Convocatoria institucional abierta.']);
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
