import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetupChecklist as SetupData } from '@/api/dashboard';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';

const afterEachHook = vi.hoisted(() => ({ callbacks: [] as Array<() => void> }));
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ fullPath: '/coordinacion/revisiones' }),
  useRouter: () => ({ push: vi.fn(), afterEach: (callback: () => void) => { afterEachHook.callbacks.push(callback); return () => undefined; } }),
}));
vi.mock('@/api/dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dashboard')>()),
  getDashboard: vi.fn().mockResolvedValue({ metrics: [], setup: null, deadline: null, coordination_convocation: null }),
}));

const step = (key: string, done: boolean) => ({ key, label: `Paso ${key}.`, hint: `Pista ${key}.`, done, action: null });
const setup = (done: boolean[]): SetupData => ({
  title: 'Antes de empezar', intro: '', done: 0, total: done.length + 1,
  steps: [...['curriculum', 'scheduled_subjects', 'parallels', 'teachers'].slice(0, done.length).map((key, index) => step(key, done[index]!)), step('convocation', false)],
});

describe('SetupChecklist', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';
    sessionState.replace({ user: { id: 'u1' }, active_role: { id: 'r1', code: 'coordinador' } } as never);
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it('lista los pasos sin el de abrir la convocatoria, marca los hechos y se abre solo la primera vez', async () => {
    setupChecklistState.update(setup([true, false, false, false]));
    const wrapper = mount(SetupChecklist);
    await flushPromises();

    const panel = document.body.querySelector('.driver-checklist')!;
    expect(panel.classList.contains('setup-pending')).toBe(true);
    const items = [...panel.querySelectorAll('.driver-checklist-item')];
    expect(items).toHaveLength(4);
    expect(items[0]!.classList.contains('driver-checklist-item-done')).toBe(true);
    expect(items[1]!.textContent).toContain('Paso scheduled_subjects');
    expect(items[1]!.textContent).toContain('Pista scheduled_subjects');
    expect(panel.querySelector('.driver-checklist-panel')!.hasAttribute('hidden')).toBe(false);
    wrapper.unmount();
    expect(document.body.querySelector('.driver-checklist')).toBeNull();
  });

  it('con todo completo deja de verse pendiente', async () => {
    setupChecklistState.update(setup([true, true, true, true]));
    const wrapper = mount(SetupChecklist);
    await flushPromises();

    expect(document.body.querySelector('.driver-checklist')!.classList.contains('setup-done')).toBe(true);
    wrapper.unmount();
  });
});
