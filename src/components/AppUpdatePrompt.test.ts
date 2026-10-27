import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import AppUpdatePrompt from '@/components/AppUpdatePrompt.vue';

const needRefresh = ref(false);
const updateServiceWorker = vi.fn();

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: () => ({ needRefresh, offlineReady: ref(false), updateServiceWorker }),
}));

describe('AppUpdatePrompt', () => {
  it('avisa cuando hay una versión nueva y solo ofrece actualizar', async () => {
    const wrapper = mount(AppUpdatePrompt);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    needRefresh.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Hay una versión nueva del sistema.');
    expect(updateServiceWorker).not.toHaveBeenCalled();

    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Actualizar']);

    await wrapper.get('button').trigger('click');
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
  });
});
