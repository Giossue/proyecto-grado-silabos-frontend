import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacePage from '@/pages/WorkspacePage.vue';
import { getSession, selectActiveRole } from '@/api/session';
import { sessionState } from '@/state/session';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace }),
}));
vi.mock('@/api/session', () => ({
  getSession: vi.fn(),
  selectActiveRole: vi.fn(),
}));

const teacherRole = (id: string, careerName: string) => ({
  id,
  code: 'docente' as const,
  career_id: `${id}-career`,
  career_name: careerName,
});

const sessionFor = (
  availableRoles: ReturnType<typeof teacherRole>[],
  activeRole: ReturnType<typeof teacherRole> | null = availableRoles[0] ?? null,
) => ({
  user: {
    id: 'user-1',
    name: 'Docente',
    email: 'docente@example.test',
    email_verified: true,
    can_edit_identity: false,
  },
  active_role: activeRole,
  available_roles: availableRoles,
});

const mountPage = () => mount(WorkspacePage, {
  global: {
    stubs: {
      PageFrame: { template: '<main><slot /></main>' },
    },
  },
});

describe('WorkspacePage', () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(getSession).mockReset();
    vi.mocked(selectActiveRole).mockReset();
    sessionState.clear();
  });

  it('continúa en Mis sílabos cuando el docente ya eligió su ámbito', async () => {
    const role = teacherRole('role-1', 'Software');
    vi.mocked(getSession).mockResolvedValue(sessionFor([role]));

    const wrapper = mountPage();
    await flushPromises();

    expect(replace).toHaveBeenCalledWith('/docente/mis-silabos');
    expect(selectActiveRole).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('pide elegir aunque el docente tenga una sola carrera (I-121)', async () => {
    const role = teacherRole('role-1', 'Software');
    vi.mocked(getSession).mockResolvedValue(sessionFor([role], null));

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('[data-slot="card"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Docencia · Software');
    expect(selectActiveRole).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('muestra una tarjeta por carrera docente y lleva a sus sílabos', async () => {
    const roles = [teacherRole('role-1', 'Software'), teacherRole('role-2', 'Turismo')];
    vi.mocked(getSession).mockResolvedValue(sessionFor(roles, null));
    vi.mocked(selectActiveRole).mockResolvedValue(sessionFor(roles, roles[1]));

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('[data-slot="card"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Docencia · Software');
    expect(wrapper.text()).toContain('Docencia · Turismo');
    expect(wrapper.findAll('button').filter((button) => button.text() === 'Ver mis sílabos')).toHaveLength(2);

    await wrapper.findAll('button').find((button) => button.text() === 'Ver mis sílabos')?.trigger('click');
    await flushPromises();

    expect(selectActiveRole).toHaveBeenCalledWith('role-1');
    expect(replace).toHaveBeenCalledWith('/docente/mis-silabos');
    wrapper.unmount();
  });

  it('presenta Biblioteca como ámbito de toda la universidad, no como Administración', async () => {
    const library = { id: 'role-library', code: 'bibliotecario' as const, career_id: null, career_name: null };
    const teacher = teacherRole('role-1', 'Software');
    vi.mocked(getSession).mockResolvedValue({ ...sessionFor([teacher], null), available_roles: [teacher, library] });
    vi.mocked(selectActiveRole).mockResolvedValue({ ...sessionFor([teacher], null), available_roles: [teacher, library], active_role: library });

    const wrapper = mountPage();
    await flushPromises();

    const card = wrapper.findAll('[data-slot="card"]').find((item) => item.text().includes('Biblioteca'))!;
    expect(card.text()).toContain('Biblioteca · toda la universidad');
    expect(card.text()).toContain('Bibliotecario');
    expect(card.text()).not.toContain('Administración');
    await card.findAll('button').find((button) => button.text() === 'Entrar a Biblioteca')!.trigger('click');
    await flushPromises();

    expect(selectActiveRole).toHaveBeenCalledWith('role-library');
    expect(replace).toHaveBeenCalledWith('/biblioteca/panel');
    wrapper.unmount();
  });
});
