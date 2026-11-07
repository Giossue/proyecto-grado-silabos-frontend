import { flushPromises, mount } from '@vue/test-utils';
import { typeConfirmation } from '@/test/confirmPhrase';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import ConvocationPeriodSheet from '@/components/domain/syllabus/ConvocationPeriodSheet.vue';

const api = vi.hoisted(() => ({ createAcademicRecord: vi.fn(), createProcess: vi.fn() }));
vi.mock('@/api/academic', async (importOriginal) => ({ ...(await importOriginal<object>()), createAcademicRecord: api.createAcademicRecord }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), createProcess: api.createProcess }));

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});
const dialogStubs = { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough, DialogClose: passthrough, DialogTrigger: passthrough };

const confirmSubmit = async (): Promise<void> => {
  document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
  typeConfirmation('convocation-open-confirm', 'abrir convocatoria');
  await flushPromises();
  const confirm = [...document.querySelectorAll('[role="dialog"] button')].reverse().find((button) => button.textContent?.includes('Abrir convocatoria'));
  (confirm as HTMLButtonElement).click();
  await flushPromises();
};
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

  it('muestra las semanas entre las fechas sin permitir editarlas', async () => {
    api.createAcademicRecord.mockResolvedValue({ message: 'Registro institucional creado.', id: 'p1' });
    api.createProcess.mockResolvedValue({ message: 'Convocatoria institucional abierta.' });
    const wrapper = await mountSheet();
    const [starts, ends] = wrapper.findAllComponents(DatePicker);
    starts.vm.$emit('update:modelValue', '2026-10-05');
    ends.vm.$emit('update:modelValue', '2027-02-26');
    await flushPromises();
    expect(document.querySelector('#convocation-period-weeks')).toBeNull();
    expect(document.body.textContent).toContain('Serían 21 semanas de clase entre las fechas');
    await fillSteps(wrapper);
    await confirmSubmit();

    expect(api.createAcademicRecord).toHaveBeenLastCalledWith('periodo', { starts_on: '2026-10-05', ends_on: '2027-02-26' });
    wrapper.unmount();
  });

  it('la frase de confirmación se borra al volver a abrir, no al cerrar', async () => {
    const wrapper = mount(ConvocationPeriodSheet, { attachTo: document.body, props: { open: true }, global: { stubs: dialogStubs } });
    await flushPromises();
    const modal = wrapper.findAllComponents(fadingDialog).at(-1)!;
    modal.vm.$emit('update:open', true);
    await flushPromises();
    typeConfirmation('convocation-open-confirm', 'abrir convocatoria');
    await flushPromises();
    modal.vm.$emit('update:open', false);
    await flushPromises();

    expect(modal.attributes('data-state')).toBe('closed');
    expect(document.body.querySelector<HTMLInputElement>('#convocation-open-confirm')!.value).toBe('abrir convocatoria');
    modal.vm.$emit('update:open', true);
    await flushPromises();
    expect(document.body.querySelector<HTMLInputElement>('#convocation-open-confirm')!.value).toBe('');

    wrapper.unmount();
  });
});
