import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import AppUpdatePrompt from '@/components/AppUpdatePrompt.vue';
import { reloadPage } from '@/lib/pageReload';

vi.mock('@/lib/pageReload', () => ({ navigateTo: vi.fn(), reloadPage: vi.fn() }));

const needRefresh = ref(false);
const updateServiceWorker = vi.fn();
const registration = { update: vi.fn() };

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: (options: { onRegisteredSW?: (url: string, registration: unknown) => void }) => {
    options.onRegisteredSW?.('/sw.js', registration);
    return { needRefresh, offlineReady: ref(false), updateServiceWorker };
  },
}));

describe('AppUpdatePrompt', () => {
  it('avisa cuando hay una versión nueva y solo ofrece actualizar', async () => {
    const wrapper = mount(AppUpdatePrompt);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    needRefresh.value = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Hay una versión nueva del sistema');
    expect(updateServiceWorker).not.toHaveBeenCalled();

    expect(wrapper.findAll('button').map((button) => button.text())).toEqual(['Actualizar']);

    await wrapper.get('button').trigger('click');
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    wrapper.unmount();
  });

  it('busca la versión nueva cada 5 minutos y al volver a la pestaña', () => {
    vi.useFakeTimers();
    registration.update.mockClear();
    const wrapper = mount(AppUpdatePrompt);

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(registration.update).toHaveBeenCalledTimes(1);

    document.dispatchEvent(new Event('visibilitychange'));
    expect(registration.update).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    vi.useRealTimers();
  });

  it('si «Actualizar» no logra recargar (otra pestaña ya activó la versión), recarga igual a los pocos segundos', async () => {
    vi.useFakeTimers();
    updateServiceWorker.mockClear();
    updateServiceWorker.mockResolvedValue(undefined);
    needRefresh.value = true;
    const wrapper = mount(AppUpdatePrompt);
    await wrapper.vm.$nextTick();

    await wrapper.get('button').trigger('click');
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(reloadPage).not.toHaveBeenCalled();
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();

    vi.advanceTimersByTime(3000);
    expect(reloadPage).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    vi.useRealTimers();
    needRefresh.value = false;
  });

  it('si otra pestaña ya actualizó, esta también muestra el aviso', async () => {
    const worker = new EventTarget();
    Object.defineProperty(navigator, 'serviceWorker', { value: worker, configurable: true });
    needRefresh.value = false;
    const wrapper = mount(AppUpdatePrompt);

    worker.dispatchEvent(new Event('controllerchange'));
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Hay una versión nueva del sistema');
    wrapper.unmount();
    needRefresh.value = false;
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });
});
