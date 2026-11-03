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

const process = (state: SyllabusProcess['state']): SyllabusProcess => ({
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
});

const mountDialog = (state: SyllabusProcess['state']) => mount(ConvocationOptionsDialog, {
  props: {
    open: true,
    row: {
      id: 'period-1', code: 'Octubre-Enero 2026-2027', starts_on: '2026-10-01', ends_on: '2027-03-01',
      teaching_weeks: 16, status: 'proximo', status_label: 'Próximo', institutional_process: null, lock_reason: null,
      process: process(state),
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

  it('el botón que cierra el diálogo dice Cancelar para no confundirse con la acción Cerrar', () => {
    const wrapper = mountDialog('abierto');
    const footer = wrapper.findAll('.button').filter((item) => !labels(wrapper).includes(item.text()));

    expect(footer.map((item) => item.text())).toEqual(['Cancelar']);
    expect(labels(wrapper)).toContain('Cerrar');
  });
});
