import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { deleteAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import ConvocationRowActions from '@/components/domain/syllabus/ConvocationRowActions.vue';

vi.mock('@/api/academic', () => ({
  deleteAcademicRecord: vi.fn(),
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });
const menuItem = defineComponent({
  props: { disabled: Boolean, variant: String },
  emits: ['select'],
  template: '<button class="menu-item" :disabled="disabled" @click="$emit(\'select\', $event)"><slot /></button>',
});
const dialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div v-if="open" data-dialog><slot /></div>',
});
const feedback = defineComponent({
  props: { message: String },
  template: '<div class="feedback">{{ message }}</div>',
});
const button = defineComponent({
  props: { type: String, disabled: Boolean },
  emits: ['click'],
  template: '<button class="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const period = (lockReason: string | null = null) => ({
  id: 'period-1',
  code: 'Octubre-Enero 2026-2027',
  starts_on: '2026-10-01',
  ends_on: '2027-03-01',
  teaching_weeks: 16,
  status: 'proximo',
  status_label: 'Próximo',
  institutional_process: null,
  lock_reason: lockReason,
  process: null,
});

const mountActions = (row = period()) => mount(ConvocationRowActions, {
  attachTo: document.body,
  props: { row: row as never },
  global: {
    stubs: {
      TableActionsMenu: passthrough,
      DropdownMenuItem: menuItem,
      Dialog: dialog,
      DialogClose: passthrough,
      DialogContent: passthrough,
      DialogDescription: passthrough,
      DialogFooter: passthrough,
      DialogHeader: passthrough,
      DialogTitle: passthrough,
      Button: button,
      FeedbackAlert: feedback,
      Spinner: true,
      Trash2: true,
      CalendarPlus: true,
      LockKeyhole: true,
      SyllabusProcessActions: true,
      SyllabusProcessSheet: true,
    },
  },
});

describe('ConvocationRowActions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('explica que al eliminar el período no se borran materias, paralelos ni docentes', async () => {
    const wrapper = mountActions();
    const remove = wrapper.findAll('.menu-item').find((item) => item.text().includes('Eliminar periodo'));
    expect(remove).toBeDefined();
    await remove!.trigger('click');
    await flushPromises();

    const text = wrapper.find('[data-dialog]').text();
    expect(text).toContain('sus fechas y sus semanas lectivas');
    expect(text).toContain('no se borran');
    expect(text).toContain('Si el período ya tiene una convocatoria, el sistema no permitirá eliminarlo');

    wrapper.unmount();
  });

  it('un período con convocatoria muestra el motivo y no ofrece eliminarlo', () => {
    const wrapper = mountActions(period('Convocatoria cerrada'));

    expect(wrapper.text()).toContain('Convocatoria cerrada');
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Eliminar periodo'))).toBe(false);

    wrapper.unmount();
  });

  it('avisa cuando el servidor rechaza la eliminación', async () => {
    vi.mocked(deleteAcademicRecord).mockRejectedValue(
      new ApiError('Este período ya tiene una convocatoria con su historial, por eso no se puede eliminar.', 422, {
        record: ['Este período ya tiene una convocatoria con su historial, por eso no se puede eliminar.'],
      }),
    );
    const wrapper = mountActions();
    const remove = wrapper.findAll('.menu-item').find((item) => item.text().includes('Eliminar periodo'));
    await remove!.trigger('click');
    await flushPromises();

    const confirm = wrapper.findAll('.button').find((item) => item.text().includes('Eliminar periodo'));
    await confirm!.trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('ya tiene una convocatoria con su historial');
    expect(deleteAcademicRecord).toHaveBeenCalledWith('periodo', 'period-1');

    wrapper.unmount();
  });
});
