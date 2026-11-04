import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resendActivation } from '@/api/session';
import VerifyEmailPage from '@/pages/VerifyEmailPage.vue';

vi.mock('@/api/session', () => ({ resendActivation: vi.fn(), logout: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const layout = defineComponent({ template: '<div><h1>{{ $attrs.title }}</h1><slot /></div>' });
const mountPage = () => mount(VerifyEmailPage, { global: { stubs: { AuthSimpleLayout: layout, AuthSplitLayout: layout } } });

describe('VerifyEmailPage — cuenta sin activar', () => {
  beforeEach(() => vi.mocked(resendActivation).mockReset());

  it('reenvía el enlace de activación y no ofrece verificar el correo', async () => {
    vi.mocked(resendActivation).mockResolvedValue({ message: 'enviado' });
    const wrapper = mountPage();

    expect(wrapper.text()).not.toContain('verificación');
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(resendActivation).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain('Reenviar enlace de activación');
  });
});
