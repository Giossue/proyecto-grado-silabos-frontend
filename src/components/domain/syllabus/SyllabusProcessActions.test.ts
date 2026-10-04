import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { deleteProcess } from '@/api/processes';
import SyllabusProcessActions from '@/components/domain/syllabus/SyllabusProcessActions.vue';

vi.mock('@/api/processes', () => ({
  deleteProcess: vi.fn(),
  transitionProcess: vi.fn(),
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });
const menuItem = defineComponent({
  props: { disabled: Boolean },
  emits: ['select'],
  template: '<button class="menu-item" :disabled="disabled" @click="$emit(\'select\', $event)"><slot /></button>',
});
const dialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div v-if="open" data-dialog><slot /></div>',
});
const button = defineComponent({
  props: { disabled: Boolean, type: String },
  template: '<button :type="type ?? \'button\'" :disabled="disabled"><slot /></button>',
});

const process = () => ({
  id: 'process-1',
  name: 'Septiembre-Enero 2026-2027',
  state: 'cerrado' as const,
  template: 'Plantilla institucional de sílabo',
  period_id: 'period-1',
  period_name: 'Septiembre-Enero 2026-2027',
  starts_at: '2026-09-22T05:00:00Z',
  due_at: '2027-01-03T04:59:59Z',
  convocations_count: 1,
  configurable: false,
});

const mountActions = () => mount(SyllabusProcessActions, {
  props: { process: process() },
  global: {
    stubs: {
      TableActionsMenu: passthrough,
      DropdownMenuItem: menuItem,
      DropdownMenuSeparator: passthrough,
      Dialog: dialog,
      DialogClose: passthrough,
      DialogContent: passthrough,
      DialogDescription: passthrough,
      DialogFooter: passthrough,
      DialogHeader: passthrough,
      DialogTitle: passthrough,
      Button: button,
      Alert: passthrough,
      AlertDescription: passthrough,
      Spinner: passthrough,
      Trash2: passthrough,
      Lock: passthrough,
      SyllabusProcessSheet: true,
      DeadlineExtensionSheet: true,
    },
  },
});

describe('SyllabusProcessActions', () => {
  beforeEach(() => {
    vi.mocked(deleteProcess).mockReset().mockResolvedValue({ message: 'Convocatoria institucional eliminada.' });
  });

  it('confirms and deletes a process with all of its syllabi', async () => {
    const wrapper = mountActions();

    await wrapper.find('.menu-item').trigger('click');
    expect(wrapper.find('[data-dialog]').text()).toContain('incluidos los iniciados, aprobados y firmados');

    const confirm = wrapper.findAll('button').find((item) => item.text().includes('Eliminar convocatoria'));
    expect(confirm).toBeDefined();
    await confirm!.trigger('click');
    await flushPromises();

    expect(deleteProcess).toHaveBeenCalledWith('process-1');
    expect(wrapper.emitted('completed')).toEqual([['Convocatoria institucional eliminada.']]);
  });
});
