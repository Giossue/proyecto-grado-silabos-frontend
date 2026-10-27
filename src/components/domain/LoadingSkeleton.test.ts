import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';

const variants = [
  'table',
  'table-body',
  'table-detail',
  'detail',
  'form',
  'document',
  'dashboard',
  'academic',
  'catalog',
  'cards',
  'syllabus-cards',
  'accordion',
  'academic-structure',
  'notifications',
  'workspace',
  'syllabus',
  'review',
  'documents',
  'source',
  'template',
  'comparison',
  'settings',
] as const;

describe('LoadingSkeleton', () => {
  it.each(variants)('renderiza una superficie accesible para %s', (variant) => {
    const wrapper = mount(LoadingSkeleton, {
      props: {
        variant,
        rows: 2,
        columns: 3,
        mode: 'schedule',
      },
    });

    const status = wrapper.get('[role="status"]');

    expect(status.attributes('aria-live')).toBe('polite');
    expect(status.attributes('aria-busy')).toBe('true');
    expect(status.text()).toContain('Cargando contenido');
    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.findAll('input')).toHaveLength(0);
  });

  it('respeta el modo de curriculum sin introducir controles enfocables', () => {
    const wrapper = mount(LoadingSkeleton, {
      props: { variant: 'academic-structure', mode: 'curriculum' },
    });

    expect(wrapper.get('[data-skeleton="curriculum-canvas"]').classes()).toContain('h-(--curriculum-canvas-height)');
    expect(wrapper.find('.bg-muted.inline-flex').exists()).toBe(false);
    expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(wrapper.findAll('button')).toHaveLength(0);
  });

  it('no duplica la búsqueda ni los filtros que ya están visibles fuera de la tabla', async () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'table-body' } });

    expect(wrapper.find('[data-skeleton="table-toolbar"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="table-pagination"]').exists()).toBe(true);

    await wrapper.setProps({ search: true, filters: 1 });

    expect(wrapper.find('[data-skeleton="table-toolbar"]').exists()).toBe(true);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.find('button, input, select, [tabindex]').exists()).toBe(false);
  });

  it.each(['administrador', 'coordinador', 'bibliotecario'] as const)('muestra tres indicadores para %s', (dashboardRole) => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'dashboard', dashboardRole } });

    expect(wrapper.get('[data-skeleton="dashboard-metrics"]').findAll('[data-slot="card"]')).toHaveLength(3);
  });

  it('dibuja la barra de herramientas dentro de una tarjeta y sin acciones cuando la tabla no las tiene', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'table', columns: 4, filters: 2, actions: false, rows: 2 } });

    expect(wrapper.get('[data-skeleton="table-toolbar"]').attributes('data-slot')).toBe('card');
    expect(wrapper.findAll('[data-skeleton="table-filters"] [data-slot="skeleton"]')).toHaveLength(2);
    expect(wrapper.get('[data-skeleton="table-row"]').element.children).toHaveLength(4);
  });

  it.each(['bibliotecario'] as const)('no inventa plazo ni puesta en marcha para %s', (dashboardRole) => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'dashboard', dashboardRole } });

    expect(wrapper.find('[data-skeleton="dashboard-metrics"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="dashboard-deadline"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="dashboard-setup"]').exists()).toBe(false);
  });

  it('anticipa los indicadores del docente sobre sus sílabos', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'syllabus-cards', rows: 2 } });

    expect(wrapper.get('[data-skeleton="syllabus-metrics"]').findAll('[data-slot="card"]')).toHaveLength(3);
    expect(wrapper.findAll('[data-skeleton="syllabus-card"]')).toHaveLength(2);
  });

  it('actualiza la superficie al cambiar el rol activo durante la carga', async () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'dashboard', dashboardRole: 'coordinador' } });

    expect(wrapper.find('[data-skeleton="dashboard-deadline"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="dashboard-setup"]').exists()).toBe(true);

    await wrapper.setProps({ dashboardRole: 'bibliotecario' });

    expect(wrapper.find('[data-skeleton="dashboard-deadline"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="dashboard-setup"]').exists()).toBe(false);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
  });
});
