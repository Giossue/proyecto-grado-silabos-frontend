import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getScheduledSubjects, type ScheduledSubjects } from '@/api/career-academics';
import { getSession } from '@/api/session';
import SupportDocumentsPanel from '@/components/domain/academic/SupportDocumentsPanel.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import CoordinationCareerProjectPage from '@/pages/CoordinationCareerProjectPage.vue';

const push = vi.fn();
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ params: {}, query: {}, fullPath: '/coordinacion/proyecto-carrera' }),
  useRouter: () => ({ replace: vi.fn(), push }),
}));
vi.mock('@/api/career-academics', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/api/career-academics')>()), getScheduledSubjects: vi.fn() }));
vi.mock('@/api/session', () => ({ getSession: vi.fn() }));

const subject = (id: string, nombre: string, ciclo: number, extra: Record<string, unknown> = {}) => ({ id, nombre, ciclo, generates_syllabus: true, profile_complete: true, ...extra });
const scheduled = (subjects: unknown[]) => ({ career: { lock_reason: null, lock: null }, options: { activeSubjects: subjects } }) as unknown as ScheduledSubjects;
const mountPage = () => mount(CoordinationCareerProjectPage, { attachTo: document.body, global: { stubs: { FichaImportDialog: true, SupportDocumentsPanel: true, ProcessLockAlert: true } } });

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

  it('al pulsar una tarjeta, con el mouse o con el teclado, abre la página del proyecto de carrera de esa materia', async () => {
    const wrapper = mountPage();
    await flushPromises();
    for (const trigger of wrapper.findAll('[data-slot="collapsible-trigger"]')) await trigger.trigger('click');
    await flushPromises();

    await wrapper.get('[aria-label="Abrir el proyecto de carrera de Matemática Discreta"]').trigger('click');
    expect(push).toHaveBeenLastCalledWith('/coordinacion/proyecto-carrera/m2');

    await wrapper.get('[aria-label="Abrir el proyecto de carrera de Estructuras de Datos"]').trigger('keydown.enter');
    expect(push).toHaveBeenLastCalledWith('/coordinacion/proyecto-carrera/m3');
    wrapper.unmount();
  });

  it('los documentos de apoyo son una pestaña con su propio botón para subir y sin el aviso de edición bloqueada', async () => {
    vi.mocked(getScheduledSubjects).mockResolvedValue({ ...scheduled([subject('m2', 'Matemática Discreta', 1)]), career: { lock_reason: 'Convocatoria abierta', lock: { label: 'Edición bloqueada', reason: 'Convocatoria abierta' } } } as unknown as ScheduledSubjects);
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(ProcessLockAlert).exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Subir documento');

    const tab = wrapper.findAll('[role="tab"]').find((item) => item.text() === 'Documentos de apoyo')!;
    await tab.trigger('mousedown', { button: 0 });
    await flushPromises();

    expect(wrapper.text()).toContain('Subir documento');
    expect(wrapper.findComponent(ProcessLockAlert).exists()).toBe(false);
    expect(wrapper.findComponent(SupportDocumentsPanel).exists()).toBe(true);
    await wrapper.findAll('button').find((button) => button.text() === 'Subir documento')!.trigger('click');
    expect(wrapper.findComponent(SupportDocumentsPanel).props('uploadOpen')).toBe(true);
    wrapper.unmount();
  });
});
