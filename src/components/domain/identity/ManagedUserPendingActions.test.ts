import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import ManagedUserPendingActions from '@/components/domain/identity/ManagedUserPendingActions.vue';

const { resendManagedUserInvitation, deleteManagedUser } = vi.hoisted(() => ({
    resendManagedUserInvitation: vi.fn(),
    deleteManagedUser: vi.fn(),
}));

vi.mock('@/api/admin-users', () => ({
    resendManagedUserInvitation,
    deleteManagedUser,
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });
const menuItem = defineComponent({
    emits: ['select'],
    template: `<button class="menu-item" @click="$emit('select', $event)"><slot /></button>`,
});
const dialog = defineComponent({
    props: { open: Boolean },
    template: '<div v-if="open" data-dialog><slot /></div>',
});

describe('ManagedUserPendingActions', () => {
    beforeEach(() => {
        resendManagedUserInvitation.mockReset();
        deleteManagedUser.mockReset();
    });

    it('mantiene abierta la confirmación al seleccionar el reenvío desde el menú', async () => {
        const wrapper = mount(ManagedUserPendingActions, {
            global: {
                stubs: {
                    DropdownMenuItem: menuItem,
                    Dialog: dialog,
                    DialogClose: passthrough,
                    DialogContent: passthrough,
                    DialogDescription: passthrough,
                    DialogFooter: passthrough,
                    DialogHeader: passthrough,
                    DialogTitle: passthrough,
                    Button: passthrough,
                    MailCheck: passthrough,
                    Spinner: passthrough,
                    Trash2: passthrough,
                },
            },
            props: {
                userId: 'user-1',
                userName: 'Docente',
                userEmail: 'docente@example.test',
            },
        });

        await wrapper.find('.menu-item').trigger('click');

        expect(wrapper.find('[data-dialog]').exists()).toBe(true);
    });
});
