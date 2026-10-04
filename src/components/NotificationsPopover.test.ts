import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsPopover from '@/components/NotificationsPopover.vue';
import { getNotifications, openNotification, type Notification } from '@/api/notifications';
import { sessionState } from '@/state/session';

const { push, load } = vi.hoisted(() => ({ push: vi.fn(), load: vi.fn() }));

vi.mock('vue-router', () => ({
    useRoute: () => ({ path: '/rol' }),
    useRouter: () => ({ push }),
    RouterLink: { template: '<a><slot /></a>' },
}));
vi.mock('@/api/notifications', () => ({
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    openNotification: vi.fn(),
}));

const notification = (overrides: Partial<Notification> = {}): Notification => ({
    id: 'notification-1',
    tipo: 'silabo.aprobado',
    titulo: 'Sílabo aprobado',
    mensaje: 'Coordinación aprobó el sílabo.',
    leido_en: null,
    notificado_en: new Date().toISOString(),
    has_destination: true,
    context: 'Docente · Software',
    ...overrides,
});

const mountOpen = async () => {
    const wrapper = mount(NotificationsPopover, {
        attachTo: document.body,
        global: {
            stubs: {
                Popover: { template: '<div><slot /></div>' },
                PopoverAnchor: { template: '<div><slot /></div>' },
                PopoverContent: { template: '<div><slot /></div>' },
                DropdownMenu: { template: '<div />' },
            },
        },
    });
    await flushPromises();
    (wrapper.vm as unknown as { open: boolean }).open = true;
    await flushPromises();

    return wrapper;
};

describe('NotificationsPopover', () => {
    beforeEach(() => {
        push.mockReset();
        load.mockReset();
        vi.mocked(openNotification).mockReset();
        vi.mocked(getNotifications).mockResolvedValue({
            filters: { status: 'all' },
            unread_count: 1,
            notifications: { data: [notification()], current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1 },
        });
        sessionState.replace(null);
        vi.spyOn(sessionState, 'load').mockImplementation(load);
    });

    it('sin ámbito elegido muestra el contexto y no ofrece la página completa', async () => {
        const wrapper = await mountOpen();

        expect(wrapper.text()).toContain('Docente · Software');
        expect(wrapper.text()).not.toContain('Ver todas las notificaciones');
        wrapper.unmount();
    });

    it('abre el aviso por el servidor y navega solo después de actualizar la sesión (I-121)', async () => {
        vi.mocked(openNotification).mockResolvedValue({ path: '/docente/mis-silabos/s-1', role_changed: true });
        const wrapper = await mountOpen();

        await wrapper.find('li button').trigger('click');
        await flushPromises();

        expect(openNotification).toHaveBeenCalledWith('notification-1');
        expect(load).toHaveBeenCalledWith(true);
        expect(push).toHaveBeenCalledWith('/docente/mis-silabos/s-1');
        expect(load.mock.invocationCallOrder[0]).toBeLessThan(push.mock.invocationCallOrder[0]);
        wrapper.unmount();
    });
});
