import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { deleteProcess, getProcessImpact, transitionProcess, type SyllabusProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
import DeadlineExtensionSheet from '@/components/domain/syllabus/DeadlineExtensionSheet.vue';
import SyllabusProcessActions from '@/components/domain/syllabus/SyllabusProcessActions.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';

vi.mock('@/api/processes', () => ({
  deleteProcess: vi.fn(),
  getProcessImpact: vi.fn(),
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
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
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
  deletable: false,
  extensions_used: 0,
  extensions_max: 2,
  extension_limit_on: '2027-02-26',
  extension_block_reason: null,
});

const pausedProcess = () => ({ ...process(), state: 'pausado' as const, deletable: true });
const openProcess = () => ({ ...process(), state: 'abierto' as const, deletable: true });

const mountActions = (value = process(), dialogStub = dialog) => mount(SyllabusProcessActions, {
  props: { process: value },
  global: {
    stubs: {
      TableActionsMenu: passthrough,
      DropdownMenuItem: menuItem,
      DropdownMenuSeparator: passthrough,
      Dialog: dialogStub,
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
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    vi.mocked(deleteProcess).mockReset().mockResolvedValue({ message: 'Convocatoria institucional eliminada.' });
    vi.mocked(getProcessImpact).mockReset().mockResolvedValue({
      syllabi: { sin_iniciar: 12, borrador: 3, en_revision: 5, correccion_solicitada: 0, aprobado: 2 },
      total: 22,
    });
    vi.mocked(transitionProcess).mockReset();
  });

  it('antes de eliminar muestra cuántos sílabos se borran y pide el mensaje y la frase', async () => {
    vi.useFakeTimers();
    const wrapper = mountActions(openProcess());

    const remove = wrapper.findAll('.menu-item').find((item) => item.text().includes('Eliminar'));
    expect(remove).toBeDefined();
    await remove!.trigger('click');
    await flushPromises();

    expect(getProcessImpact).toHaveBeenCalledWith('process-1');
    const dialog = wrapper.find('[data-dialog]');
    expect(dialog.text()).toContain('incluso los enviados y aprobados');
    const rows = dialog.findAll('tbody tr').map((row) => row.text());
    expect(rows).toEqual(['Sin iniciar12', 'Borrador3', 'En revisión5', 'Corrección solicitada0', 'Aprobado2', 'Total22']);
    expect(dialog.find('label[for="process-delete-message"]').text()).toContain('Mensaje para docentes, coordinación y biblioteca');

    const confirm = wrapper.findAll('button').find((item) => item.text().includes('Eliminar convocatoria'));
    expect(confirm).toBeDefined();
    expect(confirm!.attributes('disabled')).toBeDefined();
    await wrapper.get('#process-delete-confirm').setValue('eliminar convocatoria');
    expect(confirm!.attributes('disabled')).toBeDefined();
    await wrapper.get('#process-delete-message').setValue('   ');
    expect(confirm!.attributes('disabled')).toBeDefined();
    await wrapper.get('#process-delete-message').setValue('  Se abrirá otra con las fechas correctas.  ');
    expect(confirm!.attributes('disabled')).toBeUndefined();
    await confirm!.trigger('click');
    await flushPromises();

    expect(deleteProcess).toHaveBeenCalledWith('process-1', { mensaje: 'Se abrirá otra con las fechas correctas.' });
    // El padre quita la fila al refrescar: avisa cuando el modal terminó de cerrarse.
    expect(wrapper.emitted('completed')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(wrapper.emitted('completed')).toEqual([['Convocatoria institucional eliminada.']]);
  });

  it('al cerrar, el modal de pausar sigue mostrando su contenido mientras se desvanece', async () => {
    const wrapper = mountActions({ ...process(), state: 'abierto' }, fadingDialog);

    await wrapper.findAll('.menu-item').find((item) => item.text().includes('Pausar'))!.trigger('click');
    const transition = wrapper.findAllComponents(fadingDialog)[0]!;
    expect(transition.attributes('data-state')).toBe('open');
    transition.vm.$emit('update:open', false);
    await flushPromises();

    expect(transition.attributes('data-state')).toBe('closed');
    expect(transition.text()).toContain('Pausar la convocatoria');
    expect(transition.text()).toContain('Se detienen los envíos');
  });

  it('el mensaje y la frase de eliminar se borran al volver a abrir, no al cerrar', async () => {
    const wrapper = mountActions(openProcess(), fadingDialog);

    wrapper.vm.run('eliminar');
    await flushPromises();
    await wrapper.get('#process-delete-message').setValue('Fechas equivocadas');
    await wrapper.get('#process-delete-confirm').setValue('eliminar convocatoria');
    const removal = wrapper.findAllComponents(fadingDialog)[1]!;
    removal.vm.$emit('update:open', false);
    await flushPromises();

    expect(removal.attributes('data-state')).toBe('closed');
    expect((wrapper.get('#process-delete-message').element as HTMLTextAreaElement).value).toBe('Fechas equivocadas');
    expect((wrapper.get('#process-delete-confirm').element as HTMLInputElement).value).toBe('eliminar convocatoria');
    expect(removal.findAll('tbody tr')).not.toHaveLength(0);

    wrapper.vm.run('eliminar');
    await flushPromises();
    expect((wrapper.get('#process-delete-message').element as HTMLTextAreaElement).value).toBe('');
    expect((wrapper.get('#process-delete-confirm').element as HTMLInputElement).value).toBe('');
  });

  it('muestra el error del mensaje que devuelve el servidor', async () => {
    vi.mocked(deleteProcess).mockRejectedValueOnce(new ApiError('Datos inválidos.', 422, { mensaje: ['El mensaje no puede pasar de 1000 caracteres.'] }));
    const wrapper = mountActions(pausedProcess());

    wrapper.vm.run('eliminar');
    await flushPromises();
    await wrapper.get('#process-delete-message').setValue('Mensaje');
    await wrapper.get('#process-delete-confirm').setValue('eliminar convocatoria');
    await wrapper.findAll('button').find((item) => item.text().includes('Eliminar convocatoria'))!.trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-dialog]').text()).toContain('El mensaje no puede pasar de 1000 caracteres');
    expect(wrapper.emitted('completed')).toBeUndefined();
  });

  it('sin el conteo de sílabos no deja eliminar', async () => {
    vi.mocked(getProcessImpact).mockRejectedValueOnce(new ApiError('Sin conexión.', 500));
    const wrapper = mountActions(openProcess());

    wrapper.vm.run('eliminar');
    await flushPromises();
    await wrapper.get('#process-delete-message').setValue('Mensaje');
    await wrapper.get('#process-delete-confirm').setValue('eliminar convocatoria');

    expect(wrapper.find('[data-dialog]').text()).toContain('No se pudo saber cuántos sílabos se borran');
    expect(wrapper.findAll('button').find((item) => item.text().includes('Eliminar convocatoria'))!.attributes('disabled')).toBeDefined();
  });

  it('finaliza la convocatoria tras ver lo que queda sin aprobar y escribir la frase', async () => {
    vi.mocked(transitionProcess).mockResolvedValue({ message: 'Convocatoria cerrada.' });
    const wrapper = mountActions(openProcess());

    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Cerrar'))).toBe(false);
    const finish = wrapper.findAll('.menu-item').find((item) => item.text().includes('Finalizar'));
    expect(finish).toBeDefined();
    await finish!.trigger('click');
    await flushPromises();

    expect(getProcessImpact).toHaveBeenCalledWith('process-1');
    const dialog = wrapper.find('[data-dialog]');
    expect(dialog.text()).toContain('Finalizar la convocatoria');
    expect(dialog.text()).toContain('ya no se editan, envían, revisan ni firman');
    expect(dialog.text()).toContain('un cambio de docente no los borra');
    expect(dialog.text()).toContain('Puede volver a abrirla con una prórroga mientras no hayan terminado las clases');
    expect(dialog.text()).not.toContain('no se deshace');
    expect(dialog.text()).toContain('Lo que no esté aprobado quedará solo para consulta');
    expect(dialog.findAll('tbody tr').map((row) => row.text())).toEqual(['Sin iniciar12', 'Borrador3', 'En revisión5', 'Total20']);

    const confirm = wrapper.get('[data-dialog] button[type="submit"]');
    expect(confirm.text()).toContain('Finalizar');
    expect(confirm.attributes('disabled')).toBeDefined();
    await wrapper.get('#process-transition-confirm').setValue('Cerrar convocatoria');
    expect(confirm.attributes('disabled')).toBeDefined();
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();
    expect(transitionProcess).not.toHaveBeenCalled();
    await wrapper.get('#process-transition-confirm').setValue('Finalizar convocatoria');
    expect(confirm.attributes('disabled')).toBeUndefined();
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(transitionProcess).toHaveBeenCalledWith('process-1', 'cerrar', undefined);
    expect(wrapper.emitted('completed')).toEqual([['Convocatoria cerrada.']]);
  });

  it('con todo aprobado lo dice al finalizar, sin tabla', async () => {
    vi.mocked(getProcessImpact).mockResolvedValueOnce({
      syllabi: { sin_iniciar: 0, borrador: 0, en_revision: 0, correccion_solicitada: 0, aprobado: 7 },
      total: 7,
    });
    const wrapper = mountActions(pausedProcess());

    wrapper.vm.run('cerrar');
    await flushPromises();

    const dialog = wrapper.find('[data-dialog]');
    expect(dialog.text()).toContain('Todos los sílabos están aprobados');
    expect(dialog.text()).not.toContain('Lo que no esté aprobado');
    expect(dialog.find('table').exists()).toBe(false);
  });

  it('sin el conteo de sílabos no deja finalizar', async () => {
    vi.mocked(getProcessImpact).mockReturnValueOnce(new Promise(() => {}));
    const wrapper = mountActions(openProcess());

    wrapper.vm.run('cerrar');
    await flushPromises();
    await wrapper.get('#process-transition-confirm').setValue('finalizar convocatoria');

    expect(wrapper.get('[data-dialog] button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('avisa si no pudo saber lo que queda sin aprobar y no deja finalizar', async () => {
    vi.mocked(getProcessImpact).mockRejectedValueOnce(new ApiError('Sin conexión.', 500));
    const wrapper = mountActions(openProcess());

    wrapper.vm.run('cerrar');
    await flushPromises();
    await wrapper.get('#process-transition-confirm').setValue('finalizar convocatoria');

    expect(wrapper.find('[data-dialog]').text()).toContain('No se pudo saber cuántos sílabos quedan sin aprobar');
    expect(wrapper.get('[data-dialog] button[type="submit"]').attributes('disabled')).toBeDefined();
  });

  it('una convocatoria pausada también ofrece finalizar', () => {
    const wrapper = mountActions(pausedProcess());
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Finalizar'))).toBe(true);
  });

  it('una convocatoria cerrada no ofrece finalizar ni eliminar', () => {
    const wrapper = mountActions();
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Finalizar'))).toBe(false);
    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Eliminar'))).toBe(false);
  });

  it('una convocatoria finalizada ofrece prorrogar el plazo para reabrirla', async () => {
    const wrapper = mountActions();
    const extend = wrapper.findAll('.menu-item').find((item) => item.text().includes('Prorrogar plazo'));

    expect(extend).toBeDefined();
    expect(extend!.attributes('disabled')).toBeUndefined();
    await extend!.trigger('click');
    expect(wrapper.findComponent(DeadlineExtensionSheet).props('open')).toBe(true);
    expect(wrapper.findComponent(DeadlineExtensionSheet).props('process')).toMatchObject({ id: 'process-1', state: 'cerrado' });
  });

  it('una convocatoria finalizada que no se puede reabrir desactiva prorrogar y dice por qué', () => {
    const wrapper = mountActions({ ...process(), extension_block_reason: 'Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta.' });
    const extend = wrapper.findAll('.menu-item').find((item) => item.text().includes('Prorrogar plazo'));

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(extend?.text()).toContain('Hay otra convocatoria en curso; finalícela o elimínela antes de reabrir esta');
    expect(extend?.text()).not.toContain('reabrir esta.');
  });

  it('tras prorrogar avisa con el mensaje del servidor cuando el panel ya se cerró', async () => {
    vi.useFakeTimers();
    const wrapper = mountActions();

    wrapper.vm.run('prorrogar');
    await flushPromises();
    wrapper.findComponent(DeadlineExtensionSheet).vm.$emit('saved', 'Plazo prorrogado. La convocatoria se volvió a abrir.');
    await flushPromises();

    // La lista se refresca al avisar: con el panel aún visible, cambiaría lo que muestra.
    expect(wrapper.emitted('completed')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
    expect(wrapper.emitted('completed')).toEqual([['Plazo prorrogado. La convocatoria se volvió a abrir.']]);
  });

  it('ofrece prorrogar mientras queden prórrogas', () => {
    const wrapper = mountActions(openProcess());
    const extend = wrapper.findAll('.menu-item').find((item) => item.text().includes('Prorrogar plazo'));

    expect(extend?.attributes('disabled')).toBeUndefined();
  });

  it('sin prórrogas disponibles desactiva prorrogar y dice por qué', () => {
    const wrapper = mountActions({ ...openProcess(), extensions_used: 2, extension_block_reason: 'Ya se usaron las 2 prórrogas de esta convocatoria.' });
    const extend = wrapper.findAll('.menu-item').find((item) => item.text().includes('Prorrogar plazo'));

    expect(extend?.attributes('disabled')).toBeDefined();
    expect(extend?.text()).toContain('Ya se usaron las 2 prórrogas de esta convocatoria');
  });

  it('una convocatoria en curso ofrece eliminar aunque tenga sílabos enviados', () => {
    const wrapper = mountActions(openProcess());

    expect(wrapper.findAll('.menu-item').some((item) => item.text().includes('Eliminar'))).toBe(true);
    expect(wrapper.text()).not.toContain('No se puede eliminar');
  });

  it('shows the state counts and requires explicit confirmation before rebuilding', async () => {
    vi.mocked(transitionProcess)
      .mockRejectedValueOnce(new ApiError('La plantilla cambió.', 422, {}, {
        code: 'plantilla_cambiada',
        counts: { sin_iniciar: 1, borrador: 2, en_revision: 1, correccion_solicitada: 0, aprobado: 1 },
      }))
      .mockResolvedValueOnce({ message: 'Proceso reanudado. Los envíos vuelven a admitirse.' });
    const wrapper = mountActions(pausedProcess());

    await wrapper.find('.menu-item').trigger('click');
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-dialog]').text()).toContain('Borrador');
    expect(wrapper.find('[data-dialog]').text()).toContain('Corrección solicitada');
    const destructive = wrapper.find('[data-dialog] button[type="submit"]');
    expect(destructive.text()).toContain('Reanudar y adaptar sílabos');
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();
    expect(transitionProcess).toHaveBeenCalledTimes(1);
    await wrapper.get('#process-transition-confirm').setValue('adaptar silabos');
    await wrapper.find('[data-dialog] form').trigger('submit');
    await flushPromises();

    expect(transitionProcess).toHaveBeenNthCalledWith(1, 'process-1', 'reanudar', undefined);
    expect(transitionProcess).toHaveBeenNthCalledWith(2, 'process-1', 'reanudar', { confirmar_rehacer: true });
    expect(wrapper.emitted('completed')).toEqual([['Proceso reanudado. Los envíos vuelven a admitirse.']]);
  });
});
