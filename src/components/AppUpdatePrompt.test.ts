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
  it('avisa cuando hay una versión nueva y actualiza solo si la persona lo pide', async () => {
    const wrapper = mount(AppUpdatePrompt);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    needRefresh.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Hay una versión nueva del sistema.');
    expect(updateServiceWorker).not.toHaveBeenCalled();

    await wrapper.findAll('button').find((button) => button.text() === 'Actualizar')!.trigger('click');
    expect(updateServiceWorker).toHaveBeenCalledWith(true);

    await wrapper.findAll('button').find((button) => button.text() === 'Después')!.trigger('click');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
