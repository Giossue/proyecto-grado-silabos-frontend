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
const labels = (wrapper: ReturnType<typeof mountDialog>): string[] =>
  [...wrapper.findAll('ul .button'), ...footerButtons(wrapper)].map((item) => item.text()).filter((text) => text !== 'Cancelar');

describe('ConvocationOptionsDialog', () => {
  it('lo habitual va con botones; Finalizar y Eliminar van en el pie, con texto, junto a Cancelar', async () => {
    const wrapper = mountDialog('abierto');

    expect(wrapper.findAll('ul .button').map((item) => item.text())).toEqual(['Pausar', 'Prorrogar plazo']);
    expect(wrapper.find('[aria-label="Más opciones"]').exists()).toBe(false);
    expect(footerButtons(wrapper).map((item) => item.text())).toEqual(['Finalizar', 'Eliminar', 'Cancelar']);

    await footerButtons(wrapper)[1]!.trigger('click');
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
    const extend = mountDialog('abierto').findAll('ul .button').find((item) => item.text() === 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeUndefined();
  });

  it('sin prórrogas disponibles desactiva prorrogar y muestra el motivo', () => {
    const wrapper = mountDialog('pausado', 'El plazo ya llega al último día de clases (01/03/2027).');
    const extend = wrapper.findAll('ul .button').find((item) => item.text() === 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(wrapper.find('#option-reason-prorrogar').text()).toBe('El plazo ya llega al último día de clases (01/03/2027)');
  });

  it('una convocatoria cerrada no ofrece finalizar', () => {
    expect(labels(mountDialog('cerrado'))).not.toContain('Finalizar');
  });

  it('una convocatoria finalizada ofrece prorrogar el plazo para reabrirla', async () => {
    const wrapper = mountDialog('cerrado');
    const extend = wrapper.findAll('ul .button').find((item) => item.text() === 'Prorrogar plazo');

    expect(labels(wrapper)).toEqual(['Prorrogar plazo']);
    expect(extend?.attributes('disabled')).toBeUndefined();
    await extend!.trigger('click');
    expect(wrapper.emitted('action')).toEqual([['prorrogar']]);
  });

  it('una convocatoria finalizada que no se puede reabrir desactiva prorrogar y muestra el motivo', () => {
    const wrapper = mountDialog('cerrado', 'Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta.');
    const extend = wrapper.findAll('ul .button').find((item) => item.text() === 'Prorrogar plazo');

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(wrapper.find('#option-reason-prorrogar').text()).toBe('Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta');
  });
});
