import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { deleteProcess, transitionProcess, type SyllabusProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
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

const process = (): SyllabusProcess => ({
  id: 'process-1',
  name: 'Septiembre-Enero 2026-2027',
  state: 'cerrado',
  template: 'Plantilla institucional de sílabo',
  period_id: 'period-1',
  period_name: 'Septiembre-Enero 2026-2027',
  starts_at: '2026-09-22T05:00:00Z',
  due_at: '2027-01-03T04:59:59Z',
  convocations_count: 1,
  configurable: false,
});

const pausedProcess = () => ({ ...process(), state: 'pausado' as const });
const openProcess = () => ({ ...process(), state: 'abierto' as const });

const mountActions = (value = process()) => mount(SyllabusProcessActions, {
  props: { process: value },
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
    vi.mocked(transitionProcess).mockReset();
  });

  it('elimina una convocatoria en curso tras confirmar y explica que no se borra nada', async () => {
    const wrapper = mountActions(openProcess());

    const remove = wrapper.findAll('.menu-item').find((item) => item.text().includes('Eliminar'));
    expect(remove).toBeDefined();
    await remove!.trigger('click');
    expect(wrapper.find('[data-dialog]').text()).toContain('No se borra nada');

    const confirm = wrapper.findAll('button').find((item) => item.text().includes('Eliminar convocatoria'));
    expect(confirm).toBeDefined();
    await confirm!.trigger('click');
    await flushPromises();

    expect(deleteProcess).toHaveBeenCalledWith('process-1');
    expect(wrapper.emitted('completed')).toEqual([['Convocatoria institucional eliminada.']]);
  });

  it('cierra la convocatoria tras confirmar y explica que los sílabos quedan para consulta', async () => {
    vi.mocked(transitionProcess).mockResolvedValue({ message: 'Convocatoria cerrada.' });
    const wrapper = mountActions(openProcess());

    const close = wrapper.findAll('.menu-item').find((item) => item.text().includes('Cerrar'));
    expect(close).toBeDefined();
    await close!.trigger('click');
    expect(wrapper.find('[data-dialog]').text()).toContain('solo para consulta');
    expect(wrapper.find('[data-dialog]').text()).toContain('un cambio de docente no los borra');

    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(transitionProcess).toHaveBeenCalledWith('process-1', 'cerrar', undefined);
    expect(wrapper.emitted('completed')).toEqual([['Convocatoria cerrada.']]);
  });

  it('una convocatoria cerrada no ofrece cerrar ni eliminar', () => {
    const wrapper = mountActions();
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Cerrar'))).toBe(false);
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Eliminar'))).toBe(false);
  });

  it('shows the state counts and requires explicit confirmation before rebuilding', async () => {
    vi.mocked(transitionProcess)
      .mockRejectedValueOnce(new ApiError('La plantilla cambió.', 422, {}, {
        code: 'plantilla_cambiada',
        counts: { sin_iniciar: 1, borrador: 2, en_revision: 1, correccion_solicitada: 0, aprobado: 1 },
      }))
      .mockResolvedValueOnce({ message: 'Proceso reanudado. Los sílabos se rehacieron desde cero.' });
    const wrapper = mountActions(pausedProcess());

    await wrapper.find('.menu-item').trigger('click');
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-dialog]').text()).toContain('Borrador');
    expect(wrapper.find('[data-dialog]').text()).toContain('Corrección solicitada');
    const destructive = wrapper.find('[data-dialog] button[type="submit"]');
    expect(destructive.text()).toContain('Reanudar y rehacer sílabos');
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(transitionProcess).toHaveBeenNthCalledWith(1, 'process-1', 'reanudar', undefined);
    expect(transitionProcess).toHaveBeenNthCalledWith(2, 'process-1', 'reanudar', { confirmar_rehacer: true });
    expect(wrapper.emitted('completed')).toEqual([['Proceso reanudado. Los sílabos se rehacieron desde cero.']]);
  });
});
