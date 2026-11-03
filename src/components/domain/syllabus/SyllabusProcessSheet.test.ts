import { flushPromises, mount } from '@vue/test-utils';
import { typeConfirmation } from '@/test/confirmPhrase';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import DatePicker from '@/components/DatePicker.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import { sessionState } from '@/state/session';

const api = vi.hoisted(() => ({ createProcess: vi.fn() }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), createProcess: api.createProcess }));

const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
  props: { open: Boolean },
  emits: ['update:open'],
  template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});
const dialogStubs = { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough, DialogClose: passthrough };

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  sessionState.clear();
});

describe('syllabus process dates', () => {
  it('requires the administrator to choose dates instead of copying the period dates', async () => {
    const wrapper = mount(SyllabusProcessSheet, {
      attachTo: document.body,
      props: {
        open: false,
        template: null,
        periods: [],
        period: {
          id: 'period-1',
          codigo: 'Septiembre-Enero 2026-2027',
          starts_on: '2026-09-22',
          ends_on: '2027-01-02',
        },
      },
    });

    await wrapper.setProps({ open: true });
    await flushPromises();

    const datePickers = wrapper.findAllComponents(DatePicker);
    expect(datePickers).toHaveLength(2);
    expect(datePickers[0].props('modelValue')).toBe('');
    expect(datePickers[1].props('modelValue')).toBe('');
    expect(datePickers.every((picker) => picker.props('required'))).toBe(true);

    wrapper.unmount();
  });

  it('limits the dates to the day published by the server', async () => {
    sessionState.replace({
      user: {
        id: 'user-1',
        name: 'Administración',
        email: 'admin@silabos.test',
        email_verified: true,
        can_edit_identity: true,
      },
      active_role: null,
      available_roles: [],
      institution: { today: '2026-10-21', timezone: 'America/Guayaquil' },
    });

    const wrapper = mount(SyllabusProcessSheet, {
      attachTo: document.body,
      props: {
        open: true,
        template: null,
        periods: [],
        period: {
          id: 'period-1',
          codigo: 'Septiembre-Enero 2026-2027',
          starts_on: '2026-09-22',
          ends_on: '2027-01-02',
        },
      },
    });
    await flushPromises();

    const datePickers = wrapper.findAllComponents(DatePicker);
    expect(datePickers[0].props('minValue')).toBe('2026-10-21');
    expect(datePickers[1].props('minValue')).toBe('2026-10-21');

    wrapper.unmount();
  });

  it('confirma la apertura solo después de escribir la frase', async () => {
    vi.useFakeTimers();
    api.createProcess.mockResolvedValue({ message: 'Convocatoria abierta.' });
    const wrapper = mount(SyllabusProcessSheet, {
      attachTo: document.body,
      props: { open: true, template: null, periods: [], period: { id: 'period-1', codigo: '2026-2027', starts_on: '2026-09-22', ends_on: '2027-01-02' } },
    });
    await flushPromises();
    document.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flushPromises();

    const confirm = (): HTMLButtonElement => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].reverse().find((button) => button.textContent?.includes('Abrir convocatoria'))!;
    expect(document.body.textContent).toContain('conservarán lo que escribieron en el período anterior');
    expect(confirm().disabled).toBe(true);
    typeConfirmation('process-open-confirm', 'abrir');
    await flushPromises();
    expect(confirm().disabled).toBe(true);
    typeConfirmation('process-open-confirm', 'Abrir convocatoria');
    await flushPromises();
    expect(confirm().disabled).toBe(false);
    confirm().click();
    await flushPromises();
    expect(api.createProcess).toHaveBeenCalledOnce();

    wrapper.unmount();
  });

  it('la frase de confirmación se borra al volver a abrir, no al cerrar', async () => {
    const wrapper = mount(SyllabusProcessSheet, { attachTo: document.body, props: { open: true, template: null, periods: [], period: { id: 'period-1', codigo: 'Septiembre-Enero 2026-2027' } }, global: { stubs: dialogStubs } });
    await flushPromises();
    const modal = wrapper.getComponent(fadingDialog);
    modal.vm.$emit('update:open', true);
    await flushPromises();
    typeConfirmation('process-open-confirm', 'abrir convocatoria');
    await flushPromises();
    modal.vm.$emit('update:open', false);
    await flushPromises();

    expect(modal.attributes('data-state')).toBe('closed');
    expect(document.body.querySelector<HTMLInputElement>('#process-open-confirm')!.value).toBe('abrir convocatoria');
    modal.vm.$emit('update:open', true);
    await flushPromises();
    expect(document.body.querySelector<HTMLInputElement>('#process-open-confirm')!.value).toBe('');

    wrapper.unmount();
  });
});
