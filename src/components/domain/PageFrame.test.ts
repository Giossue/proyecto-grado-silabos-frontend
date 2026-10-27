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
});
