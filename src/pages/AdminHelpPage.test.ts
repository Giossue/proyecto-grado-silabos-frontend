import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listScreenHelp } from '@/api/screen-help';
import AdminHelpPage from '@/pages/AdminHelpPage.vue';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ fullPath: '/admin/ayuda', meta: {}, matched: [] }),
}));
vi.mock('@/api/screen-help', () => ({ listScreenHelp: vi.fn(), saveScreenHelp: vi.fn(), deleteScreenHelp: vi.fn() }));

enableAutoUnmount(afterEach);

describe('AdminHelpPage', () => {
  beforeEach(() => {
    vi.mocked(listScreenHelp).mockResolvedValue({ help: [{ screen: '/admin/usuarios', title: 'Usuarios', content: 'Texto', active: true, updated_at: '2026-10-10T00:00:00Z' }] });
  });

  it('lista las pantallas de cada rol con el estado de su ayuda', async () => {
    const wrapper = mount(AdminHelpPage);
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    const users = rows.find((row) => row.text().includes('Usuarios y roles'));
    expect(users?.text()).toContain('Listo');
    expect(rows.find((row) => row.text().includes('Mis sílabos'))?.text()).toContain('Pendiente');
    expect(rows.some((row) => row.text().includes('Biblioteca'))).toBe(true);
    expect(rows.some((row) => /-(profile|security|notifications|documents)/.test(row.text()))).toBe(false);
    expect(rows.filter((row) => row.text().includes('Facultades y carreras'))).toHaveLength(1);
  });
});
