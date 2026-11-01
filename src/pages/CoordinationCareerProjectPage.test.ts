import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheduledSubjects, type ScheduledSubjects } from '@/api/career-academics';
import { getSession } from '@/api/session';
import SubjectProfileSheet from '@/components/domain/academic/SubjectProfileSheet.vue';
import CoordinationCareerProjectPage from '@/pages/CoordinationCareerProjectPage.vue';

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: {}, query: {}, fullPath: '/coordinacion/proyecto-carrera' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('@/api/career-academics', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/career-academics')>()), getScheduledSubjects: vi.fn() }));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));

const subject = (id: string, nombre: string, ciclo: number, extra: Record<string, unknown> = {}) => ({ id, nombre, ciclo, generates_syllabus: true, profile_complete: true, ...extra });
const scheduled = (subjects: unknown[]) => ({ career: { lock_reason: null, lock: null }, options: { activeSubjects: subjects } }) as unknown as ScheduledSubjects;
const mountPage = () => mount(CoordinationCareerProjectPage, { attachTo: document.body, global: { stubs: { SubjectProfileSheet: true, FichaImportDialog: true } } });

describe('Proyecto de carrera', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({ active_role: { code: 'coordinador', career_id: 'carrera-1' } } as never);
    vi.mocked(getScheduledSubjects).mockResolvedValue(scheduled([
      subject('m1', 'Programación Básica', 1, { profile_complete: false, profile_total: 18, profile_filled: 12 }),
      subject('m2', 'Matemática Discreta', 1),
      subject('m3', 'Estructuras de Datos', 2),
      subject('m4', 'Materia sin sílabo', 2, { generates_syllabus: false }),
    ]));
    document.body.innerHTML = '';
  });

  it('muestra las materias de cada ciclo como tarjetas con el estado de su proyecto de carrera', async () => {
    const wrapper = mountPage();
    await flushPromises();
    for (const trigger of wrapper.findAll('[data-slot="collapsible-trigger"]')) await trigger.trigger('click');
    await flushPromises();

    const cards = wrapper.findAll('ul[aria-label="Materias del ciclo 1"] [data-slot="card"]');
    expect(cards.map((card) => card.find('[data-slot="card-title"]').text())).toEqual(['Programación Básica', 'Matemática Discreta']);
    expect(cards[0]!.text()).toContain('12 de 18 campos');
    expect(cards[1]!.text()).toContain('Completa');
    expect(wrapper.text()).not.toContain('Materia sin sílabo');
    wrapper.unmount();
  });

  it('al pulsar una tarjeta, con el mouse o con el teclado, abre el proyecto de carrera de esa materia', async () => {
    const wrapper = mountPage();
    await flushPromises();
    for (const trigger of wrapper.findAll('[data-slot="collapsible-trigger"]')) await trigger.trigger('click');
    await flushPromises();

    await wrapper.get('[aria-label="Abrir el proyecto de carrera de Matemática Discreta"]').trigger('click');
    expect(wrapper.findComponent(SubjectProfileSheet).props()).toMatchObject({ subjectId: 'm2', subjectName: 'Matemática Discreta' });

    await wrapper.get('[aria-label="Abrir el proyecto de carrera de Estructuras de Datos"]').trigger('keydown.enter');
    expect(wrapper.findComponent(SubjectProfileSheet).props()).toMatchObject({ subjectId: 'm3' });
    wrapper.unmount();
  });
});
