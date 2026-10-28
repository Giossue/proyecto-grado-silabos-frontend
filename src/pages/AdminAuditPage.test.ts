import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuditEvents, type AuditPayload } from '@/api/operations';
import { getSession } from '@/api/session';
import AdminAuditPage from '@/pages/AdminAuditPage.vue';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({ fullPath: '/admin/auditoria' }),
}));

vi.mock('@/api/session', () => ({ getSession: vi.fn() }));
vi.mock('@/api/operations', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/operations')>()),
  getAuditEvents: vi.fn(),
}));

const payload: AuditPayload = {
  filters: {},
  action_options: [{ value: 'usuario.desactivado', label: 'Cuenta desactivada' }],
  period_options: [{ value: 'p1', label: 'Agosto-Diciembre 2026' }],
  role_options: [{ value: 'docente', label: 'Docente' }],
  career_options: [{ value: 'c1', label: 'Software' }],
  events: {
    data: [{
      id: 'event-1',
      action: 'Cuenta desactivada',
      resource: 'Usuario',
      result: 'exito',
      actor: 'Ada Administradora',
      role: 'Administrador',
      career: null,
      details: [{ label: 'Activo', value: false }],
      occurred_at: '2026-09-23T14:30:00Z',
    }],
    current_page: 1,
    last_page: 1,
    per_page: 20,
    from: 1,
    to: 1,
    total: 1,
  },
};

describe('AdminAuditPage', () => {
  enableAutoUnmount(afterEach);

  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin-1', name: 'Ada Administradora', email: 'ada@example.test', email_verified: true, can_edit_identity: true },
      active_role: { id: 'role-1', code: 'administrador', career_id: null, career_name: null },
      available_roles: [],
    });
    vi.mocked(getAuditEvents).mockResolvedValue(payload);
  });

  it('presenta un único registro resumido sin procesos ni detalles técnicos', async () => {
    const wrapper = mount(AdminAuditPage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } });
    await flushPromises();

    expect(getAuditEvents).toHaveBeenCalledWith({ page: '1' });
    expect(wrapper.findAll('th').map((cell) => cell.text())).toEqual([
      'Fecha',
      'Actividad',
      'Responsable',
    ]);
    expect(wrapper.text()).toContain('Cuenta desactivada');
    expect(wrapper.text()).toContain('Ada Administradora');
    expect(wrapper.text()).not.toContain('Procesos');
    expect(wrapper.text()).not.toContain('Activo');
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[data-slot="badge"]').exists()).toBe(false);
  });

  it('filtra por período, rol, carrera, actividad y resultado, sin búsqueda de texto libre', async () => {
    const wrapper = mount(AdminAuditPage, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } });
    await flushPromises();

    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-slot="select-trigger"]').map((trigger) => trigger.attributes('id'))).toEqual([
      'audit-period', 'audit-role', 'audit-career', 'audit-action', 'audit-result',
    ]);
    expect(wrapper.find('td').classes()).not.toContain('text-xs');
    expect(wrapper.find('td .text-xs').exists()).toBe(false);
  });
});
