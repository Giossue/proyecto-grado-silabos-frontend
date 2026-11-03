import { Users } from '@lucide/vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import PageFrame from '@/components/domain/PageFrame.vue';

vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/docente/mis-silabos', fullPath: '/docente/mis-silabos', meta: {} }) }));

const mountFrame = (loading: boolean) => mount(PageFrame, {
  props: { title: 'Mis sílabos', description: 'Los sílabos de sus materias.', loading },
  slots: { actions: '<button type="button">Historial</button>', default: '<p>Contenido</p>' },
});

describe('PageFrame', () => {
  it('no muestra los botones de la pantalla mientras carga', async () => {
    const wrapper = mountFrame(true);
    expect(wrapper.text()).not.toContain('Historial');
    expect(wrapper.text()).toContain('Contenido');

    await wrapper.setProps({ loading: false });
    expect(wrapper.get('button').text()).toBe('Historial');
  });

  it('reserva el lugar de los botones mientras carga cuando la pantalla lo pide', async () => {
    const wrapper = mount(PageFrame, {
      props: { title: 'Mis sílabos', description: 'Los sílabos de sus materias', loading: true, actionsSkeleton: ['w-44', 'w-32'] },
      slots: { actions: '<button type="button">Historial</button>' },
    });
    const placeholder = wrapper.get('[data-skeleton="page-actions"]');

    expect(placeholder.attributes('aria-hidden')).toBe('true');
    expect(placeholder.findAll('[data-slot="skeleton"]')).toHaveLength(2);

    await wrapper.setProps({ loading: false });
    expect(wrapper.find('[data-skeleton="page-actions"]').exists()).toBe(false);
    expect(wrapper.get('button').text()).toBe('Historial');
  });

  it('muestra ícono, título y descripción como skeleton mientras carga', async () => {
    const wrapper = mount(PageFrame, { props: { title: 'Usuarios y roles', description: 'Cuentas de coordinación', icon: Users, loading: true } });

    expect(wrapper.find('[data-skeleton="page-icon"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="page-title"]').exists()).toBe(true);
    expect(wrapper.find('[data-skeleton="page-description"]').exists()).toBe(true);
    expect(wrapper.get('h1').classes()).toContain('sr-only');
    expect(wrapper.find('p').exists()).toBe(false);

    await wrapper.setProps({ loading: false });
    expect(wrapper.find('[data-skeleton]').exists()).toBe(false);
    expect(wrapper.get('h1').classes()).not.toContain('sr-only');
    expect(wrapper.get('p').text()).toBe('Cuentas de coordinación');
  });

  it('anticipa el estado bajo el título cuando la pantalla lo pide', () => {
    const frame = (statusSkeleton: boolean) => mount(PageFrame, { props: { title: '', description: '', loading: true, statusSkeleton } });

    expect(frame(true).find('[data-skeleton="page-status"]').exists()).toBe(true);
    expect(frame(false).find('[data-skeleton="page-status"]').exists()).toBe(false);
  });

  it('centra el ícono entre el título y la descripción', () => {
    const wrapper = mount(PageFrame, {
      props: { title: 'Docentes', description: 'Docentes de su carrera', icon: Users },
    });

    expect(wrapper.get('h1').element.closest('.gap-3')?.classList).toContain('items-center');
  });

  it('oculta el ícono cuando la pantalla lo pide', () => {
    const wrapper = mount(PageFrame, { props: { title: 'Álgebra Lineal', description: 'Paralelo A', icon: Users, hideIcon: true } });

    expect(wrapper.find('header svg').exists()).toBe(false);
  });

  it('centra los botones con el ícono y el título', () => {
    const wrapper = mount(PageFrame, {
      props: { title: 'Docentes', description: 'Docentes de su carrera', icon: Users },
      slots: { actions: '<button type="button">Historial</button>' },
    });

    expect(wrapper.get('header').classes()).toContain('sm:items-center');
  });

  it('aplica la clase del encabezado para alinearlo con el contenido', () => {
    const wrapper = mount(PageFrame, { props: { title: 'Álgebra Lineal', description: 'Paralelo A', headerClass: 'syllabus-editor-header' } });

    expect(wrapper.get('header').classes()).toContain('syllabus-editor-header');
  });
});
