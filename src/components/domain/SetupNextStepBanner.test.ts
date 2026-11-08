import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetupChecklist } from '@/api/dashboard';
import SetupNextStepBanner from '@/components/domain/SetupNextStepBanner.vue';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';

const current = vi.hoisted(() => ({ path: '/coordinacion/revisiones' }));
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => current,
}));
vi.mock('@/api/dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dashboard')>()),
  getDashboard: vi.fn().mockResolvedValue({ metrics: [], setup: null, deadline: null, coordination_convocation: null }),
}));

const setup = (done: boolean[]): SetupChecklist => {
  const keys = ['curriculum', 'scheduled_subjects', 'parallels', 'teachers', 'convocation'];

  return { title: 'Antes de empezar', intro: '', done: 0, total: keys.length, steps: keys.map((key, index) => ({ key, label: `Paso ${key}.`, hint: `Pista ${key}.`, done: done[index] ?? false, action: null })) };
};
const mountBanner = () => mount(SetupNextStepBanner, { global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } } });

describe('SetupNextStepBanner', () => {
  beforeEach(() => {
    current.path = '/coordinacion/revisiones';
    sessionState.replace({ user: { id: 'u1' }, active_role: { id: 'r1', code: 'coordinador' } } as never);
  });

  it('dice qué paso sigue, con su número, y lleva a su pantalla', async () => {
    setupChecklistState.update(setup([true, false]));
    const wrapper = mountBanner();
    await flushPromises();

    expect(wrapper.text()).toContain('Paso 2 de 5: Paso scheduled_subjects');
    expect(wrapper.text()).toContain('Pista scheduled_subjects');
    expect(wrapper.get('a').attributes('href')).toBe('/coordinacion/materias-asignaciones');
    expect(wrapper.get('a').text()).toContain('Ir');
  });

  it('en la pantalla del paso no ofrece «Ir»', async () => {
    current.path = '/coordinacion/materias-asignaciones';
    setupChecklistState.update(setup([true, false]));
    const wrapper = mountBanner();
    await flushPromises();

    expect(wrapper.text()).toContain('Paso 2 de 5');
    expect(wrapper.find('a').exists()).toBe(false);
    // Mismo alto con o sin «Ir»: la franja no salta al cambiar de pantalla.
    expect(wrapper.get('[data-setup-next-step]').classes()).toContain('h-11');
    expect(wrapper.get('[data-setup-next-step]').classes()).not.toContain('flex-wrap');
  });

  it('el último paso es abrir la convocatoria y lleva a Revisión', async () => {
    current.path = '/coordinacion/malla';
    setupChecklistState.update(setup([true, true, true, true, false]));
    const wrapper = mountBanner();
    await flushPromises();

    expect(wrapper.text()).toContain('Paso 5 de 5: Paso convocation');
    expect(wrapper.get('a').attributes('href')).toBe('/coordinacion/revisiones');
  });

  it('con todo hecho, o sin checklist, desaparece', async () => {
    setupChecklistState.update(setup([true, true, true, true, true]));
    expect(mountBanner().find('[data-setup-next-step]').exists()).toBe(false);
    setupChecklistState.update(null);
    expect(mountBanner().find('[data-setup-next-step]').exists()).toBe(false);
  });
});
