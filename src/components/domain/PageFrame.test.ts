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

  it('centra el ícono entre el título y la descripción', () => {
    const wrapper = mount(PageFrame, {
      props: { title: 'Docentes', description: 'Docentes de su carrera.', icon: Users },
    });

    expect(wrapper.get('h1').element.closest('.gap-3')?.classList).toContain('items-center');
  });

  it('oculta el ícono cuando la pantalla lo pide', () => {
    const wrapper = mount(PageFrame, { props: { title: 'Álgebra Lineal', description: 'Paralelo A', icon: Users, hideIcon: true } });

    expect(wrapper.find('header svg').exists()).toBe(false);
  });

  it('centra los botones con el ícono y el título', () => {
    const wrapper = mount(PageFrame, {
      props: { title: 'Docentes', description: 'Docentes de su carrera.', icon: Users },
      slots: { actions: '<button type="button">Historial</button>' },
    });

    expect(wrapper.get('header').classes()).toContain('sm:items-center');
  });

  it('aplica la clase del encabezado para alinearlo con el contenido', () => {
    const wrapper = mount(PageFrame, { props: { title: 'Álgebra Lineal', description: 'Paralelo A', headerClass: 'syllabus-editor-header' } });

    expect(wrapper.get('header').classes()).toContain('syllabus-editor-header');
  });
});
