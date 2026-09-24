import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import PlanningSummary from '@/components/domain/syllabus/PlanningSummary.vue';
import type { TableLayout } from '@/lib/tableLayout';

const layout: TableLayout = {
  columns: [
    { key: 'semana', label: 'Semana', type: 'number', role: 'week' },
    { key: 'acd', label: 'ACD', type: 'number', role: 'hours_acd' },
    { key: 'ape', label: 'APE', type: 'number', role: 'hours_ape' },
    { key: 'aa', label: 'AA', type: 'number', role: 'hours_aa' },
  ],
  groups: [],
  bands: [],
  header_fields: [],
  totals: { enabled: true },
  repeat: { enabled: false },
} as TableLayout;

describe('PlanningSummary', () => {
  it('muestra filas sobrias con horas sin ceros sobrantes', () => {
    const wrapper = mount(PlanningSummary, {
      props: {
        layout,
        rows: [{ semana: 1, acd: 2, ape: 1, aa: 3 }],
        expectations: { teaching_weeks: 1, credits: '0.125', total_hours: '6.00', hours_acd: '2.00', hours_ape: '1.00', hours_aa: '3.00' },
      },
    });
    const text = wrapper.text();

    expect(text).toContain('Horas ACD');
    expect(text).toContain('2 de 2 h');
    expect(text).toContain('6 de 6 h');
    expect(text).not.toMatch(/\d\.00/);
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false);
  });

  it('marca como pendiente lo que no coincide', () => {
    const wrapper = mount(PlanningSummary, {
      props: {
        layout,
        rows: [{ semana: 1, acd: 1.5, ape: 0, aa: 0 }],
        expectations: { teaching_weeks: 2, credits: 1, total_hours: 48, hours_acd: 16, hours_ape: 16, hours_aa: 16 },
      },
    });

    expect(wrapper.text()).toContain('1.5 de 16 h');
    expect(wrapper.text()).toContain('pendiente');
    expect(wrapper.text()).toContain('Puede guardar el borrador');
  });
});
