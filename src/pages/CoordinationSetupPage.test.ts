import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CoordinationSetupPage from '@/pages/CoordinationSetupPage.vue';
import { getDashboard } from '@/api/dashboard';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));
vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));

const step = (key: string, label: string, done: boolean, action: string | null = null) => ({ key, label, hint: `Pista de ${label}`, done, action });

describe('CoordinationSetupPage', () => {
  it('muestra los pasos aunque ya estén todos hechos', async () => {
    vi.mocked(getDashboard).mockResolvedValue({
      metrics: [], deadline: null, coordination_convocation: null,
      setup: { title: 'Puesta en marcha de la carrera', intro: 'En este orden.', done: 5, total: 5, steps: ['curriculum', 'scheduled_subjects', 'parallels', 'teachers', 'convocation'].map((key) => step(key, key, true)) },
    });
    const wrapper = mount(CoordinationSetupPage, { global: { stubs: { PageFrame: { template: '<div><slot /></div>' } } } });
    await flushPromises();

    expect(wrapper.text()).toContain('Puesta en marcha de la carrera');
    expect(wrapper.text()).toContain('5 de 5');
  });

  it('lleva al siguiente paso pendiente', async () => {
    vi.mocked(getDashboard).mockResolvedValue({
      metrics: [], deadline: null, coordination_convocation: null,
      setup: { title: 'Puesta en marcha de la carrera', intro: '', done: 1, total: 5, steps: [step('curriculum', 'Malla', true), step('scheduled_subjects', 'Programar', false), step('parallels', 'Paralelos', false), step('teachers', 'Docentes', false), step('convocation', 'Abrir', false)] },
    });
    const wrapper = mount(CoordinationSetupPage, { global: { stubs: { PageFrame: { template: '<div><slot /></div>' } } } });
    await flushPromises();

    expect(wrapper.get('a').attributes('href')).toBe('/coordinacion/materias-asignaciones');
  });
});
