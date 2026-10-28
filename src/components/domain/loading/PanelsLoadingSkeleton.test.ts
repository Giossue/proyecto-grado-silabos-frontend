import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';

describe('esqueletos de paneles, ajustes y estructura académica', () => {
  it('marca el primer paso de la puesta en marcha con su acción y deja un indicador en los demás', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'setup' } });
    const steps = wrapper.get('[data-skeleton="setup"]').findAll('.rounded-md.p-2');

    expect(steps).toHaveLength(5);
    expect(steps[0]?.classes()).toContain('ring-1');
    expect(steps[0]?.findAll('[data-slot="skeleton"]').some((item) => item.classes().includes('h-8'))).toBe(true);
    expect(steps.slice(1).every((step) => !step.classes().includes('ring-1') && step.find('.size-3').exists())).toBe(true);
  });

  it.each([
    ['profile', true, 2, false],
    ['profile', false, 2, true],
    ['security', false, 3, true],
  ] as const)('dibuja el ajuste %s (solo lectura: %s) con %i campos y guardar: %s', (settingsSection, readonly, fields, save) => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'settings', settingsSection, readonly } });

    expect(wrapper.findAll('[data-skeleton="settings-field"]')).toHaveLength(fields);
    expect(wrapper.find('[data-skeleton="settings-save"]').exists()).toBe(save);
    expect(wrapper.find('[data-skeleton="settings-two-factor"]').exists()).toBe(settingsSection === 'security');
  });

  it('dibuja la malla por niveles con sus materias, sin controles enfocables', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'academic-structure', mode: 'curriculum' } });

    expect(wrapper.findAll('[data-skeleton="curriculum-level"]').length).toBeGreaterThan(1);
    expect(wrapper.findAll('[data-skeleton="curriculum-subject"]').length).toBeGreaterThan(1);
    expect(wrapper.find('button').exists()).toBe(false);
  });

  it.each([
    ['schedule', 'scheduled-subjects', 3],
    ['teachers', 'teachers', 1],
  ] as const)('dibuja la tabla del modo %s con sus filtros', (mode, marker, filters) => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'academic-structure', mode, rows: 2 } });

    expect(wrapper.find(`[data-skeleton="${marker}"]`).exists()).toBe(true);
    expect(wrapper.findAll('[data-skeleton="table-filters"] [data-slot="skeleton"]')).toHaveLength(filters);
  });
});
