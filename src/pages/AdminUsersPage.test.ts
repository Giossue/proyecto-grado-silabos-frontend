import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminUsersPage from './AdminUsersPage.vue';

const api = vi.hoisted(() => ({ getManagedUsers: vi.fn(), getSession: vi.fn() }));
vi.mock('@/api/admin-users', async (importOriginal) => ({ ...(await importOriginal<object>()), getManagedUsers: api.getManagedUsers }));
vi.mock('@/api/session', () => ({ getSession: api.getSession }));
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: vi.fn() }), useRoute: () => ({ query: {} }) }));

const user = {
  id: 'u1', nombre: 'Ana Pérez', correo_electronico: 'ana@ueb.edu.ec', active: true, pending_activation: false, invitation_expired: false,
  two_factor_enabled: false, roles: [{ id: 'r1', code: 'docente', name: 'Docente', career_name: 'Software' }], careers: ['Software'], assignments: [],
};
const WithTooltips = defineComponent({ setup: () => () => h(TooltipProvider, () => h(AdminUsersPage)) });

describe('AdminUsersPage', () => {
  it('en móvil muestra el estado junto al correo y oculta la celda de Estado', async () => {
    api.getSession.mockResolvedValue({ active_role: { code: 'administrador' }, user: { id: 'admin' } });
    api.getManagedUsers.mockResolvedValue({
      users: { data: [user], current_page: 1, last_page: 1, per_page: 15, from: 1, to: 1, total: 1 },
      filters: { q: null, status: null, role: null, career: null }, roles: [], careers: [],
    });
    const wrapper = mount(WithTooltips, { attachTo: document.body, global: { stubs: {
      PageFrame: { template: '<main><slot /></main>' }, ImportSpreadsheetDialog: true, ManagedUserDialog: true,
    } } });
    await flushPromises();

    const cells = wrapper.findAll('tbody td');
    const mobileBadge = cells[0].find('.sm\\:hidden');
    expect(cells[0].text()).toContain('ana@ueb.edu.ec');
    expect(mobileBadge.exists()).toBe(true);
    expect(mobileBadge.text()).toBe(cells[3].text());
    expect(cells[3].attributes('data-card-hide')).toBe('true');
    expect(cells).toHaveLength(4);

    wrapper.unmount();
  });
});
