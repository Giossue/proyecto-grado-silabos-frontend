import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotificationsSheet from '@/components/NotificationsSheet.vue';
import { getNotifications, openNotification, type Notification, type NotificationsResponse } from '@/api/notifications';
import { sessionState } from '@/state/session';

const { push, load, route } = vi.hoisted(() => ({ push: vi.fn(), load: vi.fn(), route: { path: '/rol' } }));

vi.mock('vue-router', () => ({
    useRoute: () => route,
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
    const wrapper = mount(NotificationsSheet, {
        attachTo: document.body,
        global: {
            stubs: {
                Sheet: { template: '<div><slot /></div>' },
                SheetContent: { template: '<div><slot /></div>' },
                SheetTitle: { template: '<h2><slot /></h2>' },
                SheetDescription: { template: '<p><slot /></p>' },
                SheetClose: { template: '<div><slot /></div>' },
                DropdownMenu: { template: '<div />' },
            },
        },
    });
    await flushPromises();
    (wrapper.vm as unknown as { open: boolean }).open = true;
    await flushPromises();

    return wrapper;
};

describe('NotificationsSheet', () => {
    beforeEach(() => {
        route.path = '/rol';
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

    it('mantiene el filtro visible mientras carga los avisos y reemplaza la carga al recibirlos', async () => {
        const payload: NotificationsResponse = { filters: { status: 'all' }, unread_count: 1, notifications: { data: [notification()], current_page: 1, last_page: 1, per_page: 20, from: 1, to: 1, total: 1 } };
        let finish!: (value: typeof payload) => void;
        vi.mocked(getNotifications).mockResolvedValueOnce(payload).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
        const wrapper = await mountOpen();

        expect(wrapper.get('[aria-label="Cargando notificaciones"]').attributes('aria-busy')).toBe('true');
        expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Filtrar notificaciones');

        finish(payload);
        await flushPromises();

        expect(wrapper.find('[aria-label="Cargando notificaciones"]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Sílabo aprobado');
        wrapper.unmount();
    });

    it('al reabrir muestra la carga en vez de los avisos anteriores', async () => {
        const wrapper = await mountOpen();
        expect(wrapper.text()).toContain('Sílabo aprobado');
        const vm = wrapper.vm as unknown as { open: boolean };
        vm.open = false;
        await flushPromises();

        vi.mocked(getNotifications).mockReturnValueOnce(new Promise(() => {}));
        vm.open = true;
        await flushPromises();

        expect(wrapper.find('[aria-label="Cargando notificaciones"]').exists()).toBe(true);
        expect(wrapper.text()).not.toContain('Sílabo aprobado');
        wrapper.unmount();
    });

    it('abre siempre en «No leídas»', async () => {
        const wrapper = await mountOpen();
        const vm = wrapper.vm as unknown as { open: boolean };

        expect(getNotifications).toHaveBeenLastCalledWith('unread');
        await wrapper.findAll('[role="radio"]').find((option) => option.text() === 'Todas')!.trigger('click');
        await flushPromises();
        expect(getNotifications).toHaveBeenLastCalledWith('all');

        vm.open = false;
        await flushPromises();
        vm.open = true;
        await flushPromises();
        expect(getNotifications).toHaveBeenLastCalledWith('unread');
        wrapper.unmount();
    });

    it('sin avisos aclara que solo cuenta el período en curso', async () => {
        vi.mocked(getNotifications).mockResolvedValue({
            filters: { status: 'all' },
            unread_count: 0,
            notifications: { data: [], current_page: 1, last_page: 1, per_page: 20, from: null, to: null, total: 0 },
        });
        const wrapper = await mountOpen();

        expect(wrapper.text()).toContain('No tiene notificaciones sin leer en este período');
        wrapper.unmount();
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

    it('la campana queda marcada en la lista de avisos, no en la pestaña «Notificaciones» de Configuración', async () => {
        const bell = async (path: string): Promise<string> => {
            route.path = path;
            const wrapper = mount(NotificationsSheet, { attachTo: document.body });
            await flushPromises();
            const classes = wrapper.get('button[aria-haspopup="dialog"]').classes().join(' ');
            wrapper.unmount();
            return classes;
        };

        expect(await bell('/docente/notificaciones')).toContain('bg-secondary');
        expect(await bell('/docente/configuracion/notificaciones')).not.toContain('bg-secondary');
    });
});
