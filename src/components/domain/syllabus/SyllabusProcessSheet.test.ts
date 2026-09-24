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
});
