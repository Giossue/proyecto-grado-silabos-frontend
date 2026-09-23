import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import DatePicker from '@/components/DatePicker.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';

afterEach(() => {
  document.body.innerHTML = '';
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
        openImmediately: true,
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

  it('keeps the saved dates when editing an existing process', async () => {
    const wrapper = mount(SyllabusProcessSheet, {
      attachTo: document.body,
      props: {
        open: false,
        template: null,
        periods: [],
        process: {
          id: 'process-1',
          name: 'Convocatoria Septiembre-Enero 2026-2027',
          period_id: 'period-1',
          period_name: 'Septiembre-Enero 2026-2027',
          starts_at: '2026-10-01T05:00:00.000000Z',
          due_at: '2026-12-15T04:59:59.000000Z',
        },
      },
    });

    await wrapper.setProps({ open: true });
    await flushPromises();

    const datePickers = wrapper.findAllComponents(DatePicker);
    expect(datePickers[0].props('modelValue')).toBe('2026-10-01');
    expect(datePickers[1].props('modelValue')).toBe('2026-12-15');

    wrapper.unmount();
  });
});
