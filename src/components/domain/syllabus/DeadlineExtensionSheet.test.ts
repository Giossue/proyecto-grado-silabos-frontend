import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { ApiError } from '@/api/client';
import { extendProcessDeadline, type SyllabusProcess } from '@/api/processes';
import DatePicker from '@/components/DatePicker.vue';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';

vi.mock('@/api/processes', () => ({
  extendProcessDeadline: vi.fn(),
}));

const process = (extensionsUsed = 0, state: SyllabusProcess['state'] = 'abierto'): SyllabusProcess => ({
  id: 'process-1',
  name: 'Octubre-Febrero 2026-2027',
  state,
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

const submitButton = (): HTMLButtonElement => document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const submit = async (): Promise<void> => {
  document.body.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  await flushPromises();
};

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

  it('en una convocatoria abierta no habla de reabrir', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.body.textContent).not.toContain('se vuelve a abrir');
    expect(submitButton().textContent).toContain('Prorrogar entrega');
    // FormSheetActions sin `destructive` deja el botón principal como antes, sin variante.
    expect(submitButton().dataset.variant).toBeUndefined();
    wrapper.unmount();
  });

  it('en una convocatoria finalizada avisa que prorrogar la vuelve a abrir y pasa el mensaje del servidor', async () => {
    vi.mocked(extendProcessDeadline).mockResolvedValueOnce({ message: 'Plazo prorrogado. La convocatoria se volvió a abrir.' });
    const wrapper = mountSheet(process(0, 'cerrado'));
    await flushPromises();

    expect(document.body.textContent).toContain('Al prorrogar, la convocatoria se vuelve a abrir con la nueva fecha');
    expect(submitButton().textContent).toContain('Prorrogar y reabrir');
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await submit();

    expect(extendProcessDeadline).toHaveBeenCalledWith('process-1', { due_at: '2027-02-15' });
    expect(wrapper.emitted('saved')).toEqual([['Plazo prorrogado. La convocatoria se volvió a abrir.']]);
    wrapper.unmount();
  });

  it('si la plantilla cambió tras finalizar, pide confirmar con los conteos y la frase y reenvía con confirmar_rehacer', async () => {
    vi.mocked(extendProcessDeadline)
      .mockRejectedValueOnce(new ApiError('La plantilla cambió después de finalizar la convocatoria.', 422, {}, {
        code: 'plantilla_cambiada',
        counts: { sin_iniciar: 1, borrador: 2, en_revision: 1, correccion_solicitada: 0, aprobado: 3 },
      }))
      .mockResolvedValueOnce({ message: 'Plazo prorrogado. La convocatoria se volvió a abrir.' });
    const wrapper = mountSheet(process(0, 'cerrado'));
    await flushPromises();
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await submit();

    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(document.body.textContent).toContain('los sílabos de este período se adaptan a la plantilla nueva');
    expect([...document.body.querySelectorAll('tbody tr')].map((row) => row.textContent)).toEqual(['Sin iniciar1', 'Borrador2', 'En revisión1', 'Corrección solicitada0', 'Aprobado3']);
    expect(submitButton().textContent).toContain('Prorrogar y adaptar sílabos');
    expect(submitButton().dataset.variant).toBe('destructive');
    expect(submitButton().disabled).toBe(true);

    const phrase = document.body.querySelector<HTMLInputElement>('#extension-template-confirm')!;
    phrase.value = 'otra cosa';
    phrase.dispatchEvent(new Event('input'));
    await flushPromises();
    expect(submitButton().disabled).toBe(true);
    await submit();
    expect(extendProcessDeadline).toHaveBeenCalledTimes(1);

    phrase.value = 'adaptar silabos';
    phrase.dispatchEvent(new Event('input'));
    await flushPromises();
    expect(submitButton().disabled).toBe(false);
    await submit();

    expect(extendProcessDeadline).toHaveBeenNthCalledWith(1, 'process-1', { due_at: '2027-02-15' });
    expect(extendProcessDeadline).toHaveBeenNthCalledWith(2, 'process-1', { due_at: '2027-02-15', confirmar_rehacer: true });
    expect(wrapper.emitted('saved')).toEqual([['Plazo prorrogado. La convocatoria se volvió a abrir.']]);
    wrapper.unmount();
  });

  it('si hay cambios pendientes que devuelven sílabos, pide confirmar con los conteos y reenvía con confirmar_cambios', async () => {
    vi.mocked(extendProcessDeadline)
      .mockRejectedValueOnce(new ApiError('Hubo cambios.', 422, {}, {
        code: 'cambios_pendientes',
        counts: { to_draft: 2, restarted: 0, to_coordination: 1 },
      }))
      .mockResolvedValueOnce({ message: 'Plazo prorrogado. La convocatoria se volvió a abrir.' });
    const wrapper = mountSheet(process(0, 'cerrado'));
    await flushPromises();
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await submit();

    expect(wrapper.emitted('saved')).toBeUndefined();
    expect([...document.body.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Vuelven a borrador, sin su historial ni sus firmas2',
      'Vuelven a Coordinación, sin sus aprobaciones1',
    ]);
    expect(submitButton().textContent).toContain('Prorrogar y aplicar cambios');
    expect(submitButton().dataset.variant).toBe('destructive');
    expect(submitButton().disabled).toBe(true);

    const phrase = document.body.querySelector<HTMLInputElement>('#extension-template-confirm')!;
    phrase.value = 'aplicar cambios';
    phrase.dispatchEvent(new Event('input'));
    await flushPromises();
    await submit();

    expect(extendProcessDeadline).toHaveBeenNthCalledWith(2, 'process-1', { due_at: '2027-02-15', confirmar_cambios: true });
    expect(wrapper.emitted('saved')).toEqual([['Plazo prorrogado. La convocatoria se volvió a abrir.']]);
    wrapper.unmount();
  });

  it('si cambiaron la plantilla y otros datos, una sola confirmación manda las dos marcas', async () => {
    vi.mocked(extendProcessDeadline)
      .mockRejectedValueOnce(new ApiError('La plantilla cambió.', 422, {}, {
        code: 'plantilla_cambiada',
        counts: { sin_iniciar: 0, borrador: 1, en_revision: 0, correccion_solicitada: 0, aprobado: 1 },
        pending_counts: { to_draft: 0, restarted: 1, to_coordination: 0 },
      }))
      .mockResolvedValueOnce({ message: 'Plazo prorrogado. La convocatoria se volvió a abrir.' });
    const wrapper = mountSheet(process(0, 'cerrado'));
    await flushPromises();
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await submit();

    expect(document.body.textContent).toContain('los sílabos de este período se adaptan a la plantilla nueva');
    expect(document.body.textContent).toContain('Se rehacen o se quitan, sin su contenido');
    expect(submitButton().textContent).toContain('Prorrogar y adaptar sílabos');
    const phrase = document.body.querySelector<HTMLInputElement>('#extension-template-confirm')!;
    phrase.value = 'adaptar sílabos';
    phrase.dispatchEvent(new Event('input'));
    await flushPromises();
    await submit();

    expect(extendProcessDeadline).toHaveBeenNthCalledWith(2, 'process-1', { due_at: '2027-02-15', confirmar_rehacer: true, confirmar_cambios: true });
    wrapper.unmount();
  });

  it('el aviso de la plantilla se borra al volver a abrir, no al cerrar', async () => {
    vi.mocked(extendProcessDeadline).mockRejectedValueOnce(new ApiError('La plantilla cambió.', 422, {}, {
      code: 'plantilla_cambiada',
      counts: { sin_iniciar: 0, borrador: 1, en_revision: 0, correccion_solicitada: 0, aprobado: 0 },
    }));
    const wrapper = mount(DeadlineExtensionSheet, { attachTo: document.body, props: { process: process(0, 'cerrado'), open: true }, global: { stubs: { FormSheet: slidingSheet } } });
    await flushPromises();
    wrapper.findComponent(DatePicker).vm.$emit('update:modelValue', '2027-02-15');
    await submit();
    expect(document.body.querySelector('#extension-template-confirm')).not.toBeNull();

    await wrapper.setProps({ open: false });
    expect(document.body.querySelector('#extension-template-confirm')).not.toBeNull();
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.body.querySelector('#extension-template-confirm')).toBeNull();
    expect(document.body.textContent).not.toContain('se adaptan a la plantilla nueva');
    wrapper.unmount();
  });
});
