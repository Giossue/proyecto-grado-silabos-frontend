import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';

describe('LoadErrorState', () => {
  it('expone el fallo y permite solicitar un reintento', async () => {
    const wrapper = mount(LoadErrorState, { props: { message: 'Servicio no disponible.' } });

    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.text()).toContain('Servicio no disponible.');
    expect(wrapper.text()).toContain('Reintentar');

    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
