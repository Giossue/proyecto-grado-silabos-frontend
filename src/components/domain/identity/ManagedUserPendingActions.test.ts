import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ManagedUserPendingActions from '@/components/domain/identity/ManagedUserPendingActions.vue';

const { resendManagedUserInvitation, deleteManagedUser } = vi.hoisted(() => ({
    resendManagedUserInvitation: vi.fn().mockResolvedValue({ message: 'Invitación enviada.' }),
    deleteManagedUser: vi.fn().mockResolvedValue({ message: 'Cuenta eliminada.' }),
}));

vi.mock('@/api/admin-users', () => ({ resendManagedUserInvitation, deleteManagedUser }));

enableAutoUnmount(afterEach);

const props = { userId: 'user-1', userName: 'Docente', userEmail: 'docente@example.test' };

describe('ManagedUserPendingActions', () => {
    beforeEach(() => {
        resendManagedUserInvitation.mockClear();
        deleteManagedUser.mockClear();
        document.body.innerHTML = '';
    });

    it('muestra la confirmación de reenvío solo cuando se pide abrirla y reenvía al confirmar', async () => {
        const wrapper = mount(ManagedUserPendingActions, { attachTo: document.body, props: { ...props, resendOpen: false } });
        expect(document.body.textContent).not.toContain('Reenviar invitación de activación');

        await wrapper.setProps({ resendOpen: true });
        await flushPromises();
        expect(document.body.textContent).toContain('docente@example.test');

        const confirm = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Reenviar invitación') as HTMLButtonElement;
        confirm.click();
        await flushPromises();
        expect(resendManagedUserInvitation).toHaveBeenCalledWith('user-1');
        expect(wrapper.emitted('changed')?.[0]).toEqual(['Invitación enviada.']);
    });

    it('elimina la cuenta pendiente al confirmar', async () => {
        const wrapper = mount(ManagedUserPendingActions, { attachTo: document.body, props: { ...props, deleteOpen: true } });
        await flushPromises();

        const confirm = [...document.body.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Eliminar cuenta') as HTMLButtonElement;
        confirm.click();
        await flushPromises();
        expect(deleteManagedUser).toHaveBeenCalledWith('user-1');
        expect(wrapper.emitted('changed')?.[0]).toEqual(['Cuenta eliminada.']);
    });
});
