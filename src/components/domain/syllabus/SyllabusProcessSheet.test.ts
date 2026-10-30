import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DatePicker from '@/components/DatePicker.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import { sessionState } from '@/state/session';

const api = vi.hoisted(() => ({ createProcess: vi.fn() }));
vi.mock('@/api/processes', async (importOriginal) => ({ ...(await importOriginal<object>()), createProcess: api.createProcess }));

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

  it('confirma la apertura con una espera de unos segundos antes de abrir', async () => {
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
    expect(confirm().textContent).toContain('(5)');
    vi.advanceTimersByTime(5000);
    await flushPromises();
    expect(confirm().disabled).toBe(false);
    confirm().click();
    await flushPromises();
    expect(api.createProcess).toHaveBeenCalledOnce();

    wrapper.unmount();
  });
});
