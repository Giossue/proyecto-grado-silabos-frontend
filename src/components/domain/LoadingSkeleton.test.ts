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

  it('anticipa el Panel de Administración: tres indicadores y seis pasos de puesta en marcha', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'dashboard' } });

    expect(wrapper.get('[data-skeleton="metrics"]').findAll('[data-slot="card"]')).toHaveLength(3);
    expect(wrapper.get('[data-skeleton="setup"]').findAll('.rounded-md.p-2')).toHaveLength(6);
  });

  it('anticipa la puesta en marcha de la carrera con sus cinco pasos y sin indicadores', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'setup' } });

    expect(wrapper.find('[data-skeleton="metrics"]').exists()).toBe(false);
    expect(wrapper.get('[data-skeleton="setup"]').findAll('.rounded-md.p-2')).toHaveLength(5);
  });

  it('dibuja la barra de herramientas dentro de una tarjeta y sin acciones cuando la tabla no las tiene', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'table', columns: 4, filters: 2, actions: false, rows: 2 } });

    expect(wrapper.get('[data-skeleton="table-toolbar"]').attributes('data-slot')).toBe('card');
    expect(wrapper.findAll('[data-skeleton="table-filters"] [data-slot="skeleton"]')).toHaveLength(2);
    expect(wrapper.get('[data-skeleton="table-row"]').element.children).toHaveLength(4);
  });

  it('anticipa los indicadores y el chip de período sobre la tabla solo cuando la pantalla los tiene', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'table', rows: 2, metrics: true, chip: true } });

    expect(wrapper.get('[data-skeleton="metrics"]').findAll('[data-slot="card"]')).toHaveLength(3);
    expect(wrapper.find('[data-skeleton="table-chip"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-skeleton="table-row"]')).toHaveLength(2);

    const plain = mount(LoadingSkeleton, { props: { variant: 'table' } });

    expect(plain.find('[data-skeleton="metrics"]').exists()).toBe(false);
    expect(plain.find('[data-skeleton="table-chip"]').exists()).toBe(false);
  });

  it('dibuja la barra de pestañas, el título de grupo y la paginación solo cuando se piden', async () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'table', tabs: 2, heading: true, pagination: false } });

    expect(wrapper.get('[data-skeleton="table-tabs"]').element.children).toHaveLength(2);
    expect(wrapper.find('[data-skeleton="table-heading"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="table-pagination"]').exists()).toBe(false);

    await wrapper.setProps({ tabs: 0, heading: false, pagination: true });

    expect(wrapper.find('[data-skeleton="table-tabs"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="table-heading"]').exists()).toBe(false);
    expect(wrapper.find('[data-skeleton="table-pagination"]').exists()).toBe(true);
  });

  it('respeta los anchos de columna indicados', () => {
    const widths = ['minmax(0, 1fr)', 'minmax(0, 2fr)', '5rem'];
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'catalog', columns: 3, actions: false, widths } });

    expect((wrapper.get('[data-skeleton="table-row"]').element as HTMLElement).style.gridTemplateColumns).toContain('5rem');
  });

  it('muestra las tarjetas de sílabo sin indicadores', () => {
    const wrapper = mount(LoadingSkeleton, { props: { variant: 'syllabus-cards', rows: 2 } });

    expect(wrapper.findAll('[data-skeleton="syllabus-card"]')).toHaveLength(2);
    expect(wrapper.find('[data-skeleton="metrics"]').exists()).toBe(false);
  });

  it('anticipa la barra lateral de secciones del formulario cuando se pide', () => {
    expect(mount(LoadingSkeleton, { props: { variant: 'form', rows: 2 } }).find('[data-skeleton="form-sections"]').exists()).toBe(false);
    expect(mount(LoadingSkeleton, { props: { variant: 'form', rows: 2, sidebar: true } }).find('[data-skeleton="form-sections"]').exists()).toBe(true);
  });
});
