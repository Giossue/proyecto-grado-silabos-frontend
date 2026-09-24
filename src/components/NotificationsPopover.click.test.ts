import { flushPromises, mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import NotificationsPopover from '@/components/NotificationsPopover.vue';
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/rol' }), useRouter: () => ({ push: vi.fn() }), RouterLink: { template: '<a><slot /></a>' } }));
vi.mock('@/api/notifications', () => ({ getNotifications: vi.fn().mockResolvedValue({ filters: { status: 'all' }, unread_count: 0, notifications: { data: [], current_page: 1, last_page: 1, per_page: 20, from: null, to: null, total: 0 } }), markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(), openNotification: vi.fn() }));
it('abre el panel al hacer clic en la campana pese al tooltip', async () => {
  const w = mount(NotificationsPopover, { attachTo: document.body });
  await flushPromises();
  const b = w.get('button[aria-label="Notificaciones"]');
  
  await b.trigger('pointerdown'); await b.trigger('mousedown'); await b.trigger('click'); await flushPromises();

  expect((w.vm as any).open).toBe(true);
});
