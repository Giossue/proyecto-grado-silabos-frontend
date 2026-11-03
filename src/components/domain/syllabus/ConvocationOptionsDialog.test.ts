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
  template: '<button class="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

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
      DialogFooter: passthrough,
      DialogHeader: passthrough,
      DialogTitle: passthrough,
      Button: button,
    },
  },
});

const labels = (wrapper: ReturnType<typeof mountDialog>): string[] => wrapper.findAll('ul .button').map((item) => item.text());

describe('ConvocationOptionsDialog', () => {
  it('ofrece eliminar con la convocatoria abierta o pausada', () => {
    expect(labels(mountDialog('abierto'))).toContain('Eliminar');
    expect(labels(mountDialog('pausado'))).toContain('Eliminar');
  });

  it('una convocatoria cerrada no ofrece eliminar', () => {
    expect(labels(mountDialog('cerrado'))).not.toContain('Eliminar');
  });

  it('la acción manual se llama Finalizar, abierta o pausada, y el botón del pie dice Cancelar', () => {
    const wrapper = mountDialog('abierto');
    const footer = wrapper.findAll('.button').filter((item) => !labels(wrapper).includes(item.text()));

    expect(footer.map((item) => item.text())).toEqual(['Cancelar']);
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
});
