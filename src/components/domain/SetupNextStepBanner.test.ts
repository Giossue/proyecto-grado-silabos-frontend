import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SetupChecklist } from '@/api/dashboard';
import SetupNextStepBanner from '@/components/domain/SetupNextStepBanner.vue';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';

vi.mock('@/api/dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/dashboard')>()),
  getDashboard: vi.fn().mockResolvedValue({ metrics: [], setup: null, deadline: null, coordination_convocation: null }),
}));

const setup = (done: boolean[]): SetupChecklist => {
  const keys = ['curriculum', 'scheduled_subjects', 'parallels', 'teachers', 'convocation'];

  return { title: 'Antes de empezar', intro: '', done: 0, total: keys.length, steps: keys.map((key, index) => ({ key, label: `Paso ${key}.`, hint: `Pista ${key}.`, done: done[index] ?? false, action: null })) };
};

describe('SetupNextStepBanner', () => {
  beforeEach(() => {
    sessionState.replace({ user: { id: 'u1' }, active_role: { id: 'r1', code: 'coordinador' } } as never);
  });

  it('dice qué paso sigue, con su número y su pista, en una franja de alto fijo', async () => {
    setupChecklistState.update(setup([true, false]));
    const wrapper = mount(SetupNextStepBanner);
    await flushPromises();

    // Cuenta los mismos pasos que el panel: abrir la convocatoria es el botón de la pantalla, no un paso numerado.
    expect(wrapper.text()).toContain('Paso 2 de 4: Paso scheduled_subjects');
    expect(wrapper.text()).toContain('Pista scheduled_subjects');
    expect(wrapper.get('[data-setup-next-step]').classes()).toContain('h-11');
    expect(wrapper.get('[data-setup-next-step]').classes()).not.toContain('flex-wrap');
  });

  it('«Ver los pasos» es un botón sin fondo que abre el panel «Antes de empezar»', async () => {
    setupChecklistState.update(setup([true, false]));
    const wrapper = mount(SetupNextStepBanner);
    await flushPromises();
    const before = setupChecklistState.openRequests.value;

    const button = wrapper.get('button');
    expect(button.text()).toBe('Ver los pasos');
    expect(button.attributes('data-variant')).toBe('link');
    await button.trigger('click');
    expect(setupChecklistState.openRequests.value).toBe(before + 1);
  });

  it('con todo hecho, o sin checklist, desaparece', async () => {
    setupChecklistState.update(setup([true, true, true, true, true]));
    expect(mount(SetupNextStepBanner).find('[data-setup-next-step]').exists()).toBe(false);
    setupChecklistState.update(null);
    expect(mount(SetupNextStepBanner).find('[data-setup-next-step]').exists()).toBe(false);
  });
});
