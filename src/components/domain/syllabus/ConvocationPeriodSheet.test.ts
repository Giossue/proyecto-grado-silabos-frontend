import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import ConvocationPeriodSheet from '@/components/domain/syllabus/ConvocationPeriodSheet.vue';

const api = vi.hoisted(() => ({ createAcademicRecord: vi.fn(), createProcess: vi.fn() }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), createAcademicRecord: api.createAcademicRecord }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), createProcess: api.createProcess }));

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

// El envío pasa por un diálogo de confirmación: enviar el formulario y aceptar.
const confirmSubmit = async (): Promise<void> => {
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  const confirm = [...document.querySelectorAll('[role="dialog"] button')].reverse().find((button) => button.textContent?.includes('Abrir convocatoria'));
  (confirm as HTMLButtonElement).click();
  await flushPromises();
};
// Paso 1 (periodo) y paso 2 (elaboración): rellena el primero, avanza y rellena el segundo.
const fillSteps = async (wrapper: Awaited<ReturnType<typeof mountSheet>>): Promise<void> => {
  const [starts, ends] = wrapper.findAllComponents(DatePicker);
  starts.vm.$emit('update:modelValue', '2026-10-05');
  ends.vm.$emit('update:modelValue', '2027-02-26');
  await flushPromises();
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  const [opens, due] = wrapper.findAllComponents(DatePicker);
  opens.vm.$emit('update:modelValue', '2026-10-06');
  due.vm.$emit('update:modelValue', '2026-10-30');
  await flushPromises();
};
const mountSheet = async () => {
  const wrapper = mount(ConvocationPeriodSheet, { attachTo: document.body, props: { open: true } });
  await flushPromises();
  return wrapper;
};

describe('ConvocationPeriodSheet', () => {
  it('pide el periodo primero, no avanza sin fechas y luego pide la elaboración', async () => {
    const wrapper = await mountSheet();
    let pickers = wrapper.findAllComponents(DatePicker);
    expect(pickers).toHaveLength(2);
    expect(pickers.every((picker) => picker.props('required'))).toBe(true);
    expect(pickers.every((picker) => picker.props('modelValue') === '')).toBe(true);
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    expect(wrapper.findAllComponents(DatePicker)).toHaveLength(2);
    expect(document.body.textContent).toContain('Periodo lectivo');

    pickers[0].vm.$emit('update:modelValue', '2026-10-05');
    pickers[1].vm.$emit('update:modelValue', '2027-02-26');
    await flushPromises();
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();
    pickers = wrapper.findAllComponents(DatePicker);
    expect(pickers).toHaveLength(2);
    expect(document.body.textContent).toContain('Elaboración de sílabos');
    expect(pickers.every((picker) => picker.props('modelValue') === '')).toBe(true);
    wrapper.unmount();
  });

  it('si la apertura falla, el reintento no vuelve a crear el periodo', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    api.createProcess.mockRejectedValueOnce(new ApiError('Error', 422, { process: ['Ya hay una convocatoria en curso.'] })).mockResolvedValueOnce({ message: 'Convocatoria institucional abierta.' });
    const wrapper = await mountSheet();
    await fillSteps(wrapper);
    await confirmSubmit();
    expect(document.body.textContent).toContain('El periodo ya quedó creado');
    await confirmSubmit();

    expect(api.createAcademicRecord).toHaveBeenCalledTimes(1);
    expect(api.createProcess).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('saved')?.[0]).toEqual(['Convocatoria institucional abierta.']);
    wrapper.unmount();
  });

  it('crea el periodo y abre la convocatoria con el id devuelto', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    api.createProcess.mockResolvedValue({ message: 'Convocatoria institucional abierta.' });
    const wrapper = await mountSheet();
    await fillSteps(wrapper);
    await confirmSubmit();

    expect(api.createProcess).toHaveBeenCalledWith({ period_id: 'p1', starts_at: '2026-10-06', due_at: '2026-10-30' });
    expect(wrapper.emitted('saved')?.[0]).toEqual(['Convocatoria institucional abierta.']);
    wrapper.unmount();
  });
});
