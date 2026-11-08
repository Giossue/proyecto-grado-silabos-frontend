import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import type { SyllabusProcess } from '@/api/processes';
import ConvocationOptionsDialog from '@/components/domain/syllabus/ConvocationOptionsDialog.vue';

const passthrough = defineComponent({ template: '<div><slot /></div>' });
const dialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div v-if="open" data-dialog><slot /></div>',
});
const button = defineComponent({
  props: { type: String, disabled: Boolean, variant: String },
  emits: ['click'],
  template: '<button class="button" :data-variant="variant" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const footer = defineComponent({ template: '<div data-footer><slot /></div>' });

const process = (state: SyllabusProcess['state'], blockReason: string | null = null): SyllabusProcess => ({
  id: 'process-1',
  name: 'Octubre-Enero 2026-2027',
  state,
  template: 'Plantilla institucional de sílabo',
  period_id: 'period-1',
  period_name: 'Octubre-Enero 2026-2027',
  starts_at: '2026-10-01',
  due_at: '2026-10-20',
  convocations_count: 1,
  configurable: state === 'pausado',
  deletable: state !== 'cerrado',
  extensions_used: blockReason ? 2 : 0,
  extensions_max: 2,
  extension_limit_on: '2027-03-01',
  extension_block_reason: blockReason,
});

const mountDialog = (state: SyllabusProcess['state'], blockReason: string | null = null) => mount(ConvocationOptionsDialog, {
  props: {
    open: true,
    row: {
      id: 'period-1', code: 'Octubre-Enero 2026-2027', starts_on: '2026-10-01', ends_on: '2027-03-01',
      teaching_weeks: 16, status: 'proximo', status_label: 'Próximo', institutional_process: null, lock_reason: null,
      process: process(state, blockReason),
    } as never,
  },
  global: {
    stubs: {
      Dialog: dialog,
      DialogClose: passthrough,
      DialogContent: passthrough,
      DialogFooter: footer,
      DialogHeader: passthrough,
      DialogTitle: passthrough,
      DialogDescription: passthrough,
      Button: button,
    },
  },
});

const footerButtons = (wrapper: ReturnType<typeof mountDialog>) => wrapper.findAll('[data-footer] .button');
const options = (wrapper: ReturnType<typeof mountDialog>) => wrapper.findAll('ul .button');
const optionLabel = (item: ReturnType<ReturnType<typeof mountDialog>['find']>): string => item.find('.font-medium').text();
const labels = (wrapper: ReturnType<typeof mountDialog>): string[] => options(wrapper).map(optionLabel);
const option = (wrapper: ReturnType<typeof mountDialog>, label: string) => options(wrapper).find((item) => optionLabel(item) === label);

describe('ConvocationOptionsDialog', () => {
  it('lista cada opción con lo que hace; Finalizar y Eliminar van al final, separadas y en rojo; el pie solo tiene Cancelar', async () => {
    const wrapper = mountDialog('abierto');

    expect(labels(wrapper)).toEqual(['Pausar', 'Prorrogar plazo', 'Finalizar', 'Eliminar']);
    expect(option(wrapper, 'Pausar')!.text()).toContain('Nadie edita, envía ni revisa hasta que la reanude');
    expect(option(wrapper, 'Eliminar')!.classes().join(' ')).toContain('text-destructive');
    expect(option(wrapper, 'Pausar')!.classes().join(' ')).not.toContain('text-destructive');
    expect(footerButtons(wrapper).map((item) => item.text())).toEqual(['Cancelar']);

    await option(wrapper, 'Eliminar')!.trigger('click');
    expect(wrapper.emitted('action')).toEqual([['eliminar']]);
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('ofrece eliminar con la convocatoria abierta o pausada', () => {
    expect(labels(mountDialog('abierto'))).toContain('Eliminar');
    expect(labels(mountDialog('pausado'))).toContain('Eliminar');
  });

  it('una convocatoria cerrada no ofrece eliminar', () => {
    expect(labels(mountDialog('cerrado'))).not.toContain('Eliminar');
  });

  it('la acción manual se llama Finalizar, abierta o pausada, y el botón del pie dice Cancelar', () => {
    const wrapper = mountDialog('abierto');
    expect(footerButtons(wrapper).at(-1)?.text()).toBe('Cancelar');
    expect(labels(wrapper)).toContain('Finalizar');
    expect(labels(wrapper)).not.toContain('Cerrar');
    expect(labels(mountDialog('pausado'))).toContain('Finalizar');
  });

  it('ofrece prorrogar mientras queden prórrogas', () => {
    const extend = option(mountDialog('abierto'), 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeUndefined();
  });

  it('sin prórrogas disponibles desactiva prorrogar y muestra el motivo', () => {
    const wrapper = mountDialog('pausado', 'El plazo ya llega al último día de clases (01/03/2027).');
    const extend = option(wrapper, 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(wrapper.find('#option-effect-prorrogar').text()).toBe('El plazo ya llega al último día de clases (01/03/2027)');
  });

  it('una convocatoria cerrada no ofrece finalizar', () => {
    expect(labels(mountDialog('cerrado'))).not.toContain('Finalizar');
  });

  it('una convocatoria finalizada ofrece prorrogar el plazo para reabrirla', async () => {
    const wrapper = mountDialog('cerrado');
    const extend = option(wrapper, 'Prorrogar plazo');

    expect(labels(wrapper)).toEqual(['Prorrogar plazo']);
    expect(extend?.attributes('disabled')).toBeUndefined();
    await extend!.trigger('click');
    expect(wrapper.emitted('action')).toEqual([['prorrogar']]);
  });

  it('una convocatoria finalizada que no se puede reabrir desactiva prorrogar y muestra el motivo', () => {
    const wrapper = mountDialog('cerrado', 'Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta.');
    const extend = option(wrapper, 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(wrapper.find('#option-effect-prorrogar').text()).toBe('Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta');
  });
});
