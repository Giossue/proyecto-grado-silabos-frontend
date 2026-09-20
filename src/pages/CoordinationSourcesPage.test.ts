import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSources } from '@/api/sources';
import { getSession } from '@/api/session';
import CoordinationSourcesPage from '@/pages/CoordinationSourcesPage.vue';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/api/sources', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/sources')>()),
  getSources: vi.fn(),
}));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));

describe('CoordinationSourcesPage', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user-1', name: 'Coordinación', email: 'coord@test.local', email_verified: true, can_edit_identity: false },
      active_role: { id: 'role-1', code: 'coordinador', career_id: 'career-1', career_name: 'Software' },
      available_roles: [],
    });
    vi.mocked(getSources).mockResolvedValue({
      processLock: null,
      sources: [
        { id: 'source-1', name: 'Reglamento académico', description: 'Normativa institucional', has_content: true, ingestion_status: 'completada', execution_id: 'execution-1' },
        { id: 'source-2', name: 'Guía docente', description: null, has_content: false, ingestion_status: 'manual', execution_id: null },
      ],
    });
  });

  it('presenta las fuentes como tarjetas y no como tabla', async () => {
    const wrapper = mount(CoordinationSourcesPage, {
      global: {
        stubs: {
          PageFrame: { template: '<main><slot name="actions" /><slot /></main>' },
          AcademicSourceCreationSheet: true,
          AcademicSourceActions: { template: '<button type="button">Acciones</button>' },
          TablePagination: true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.findAll('[data-slot="card-title"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Reglamento académico');
    expect(wrapper.text()).toContain('Contenido disponible');
    expect(wrapper.find('table').exists()).toBe(false);
    wrapper.unmount();
  });
});
