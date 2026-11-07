import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeacherSyllabiPage from '@/pages/TeacherSyllabiPage.vue';
import { getDashboard } from '@/api/dashboard';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import { getTeacherSupportDocuments } from '@/api/support-documents';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: router.push, replace: vi.fn() }),
  useRoute: () => ({ query: {} }),
  RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
}));

vi.mock('@/api/dashboard', () => ({ getDashboard: vi.fn() }));
vi.mock('@/api/syllabi', () => ({ getTeacherSyllabi: vi.fn() }));
vi.mock('@/api/support-documents', () => ({ getTeacherSupportDocuments: vi.fn(), viewSupportDocument: vi.fn() }));

const mountPage = () => mount(TeacherSyllabiPage, {
  global: { stubs: { PageFrame: { template: '<div><slot name="banner" /><slot name="tools" /><slot name="actions" /><slot /></div>' } } },
});

const syllabi: SyllabiResponse = {
  filters: { q: null, state: null },
  syllabi: {
    data: [{ id: 's1', subject: 'Álgebra Lineal', code: 'MAT-101', convocation: 'c1', period: '2026-2027', state: 'sin_iniciar', iniciado_en: null, parallels: ['A'], guardado_en: '2026-10-27T15:46:00Z' }],
    current_page: 1, last_page: 1, per_page: 15, total: 1, from: 1, to: 1,
  },
};

describe('TeacherSyllabiPage', () => {
  beforeEach(() => {
    vi.mocked(getTeacherSyllabi).mockResolvedValue(syllabi);
  });

  it('deja «Documentos de apoyo» para el sílabo: la lista solo ofrece el historial', async () => {
    vi.mocked(getTeacherSupportDocuments).mockResolvedValue({ data: [{ id: 'd1', title: 'Proyecto de carrera', size: 2048, view: 'lista', uploaded_at: '2026-11-02T15:00:00Z' }] });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[aria-label="Documentos de apoyo"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Historial"]').exists()).toBe(true);
    expect(getTeacherSupportDocuments).not.toHaveBeenCalled();
  });

  it('muestra los sílabos sin indicadores arriba', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(getDashboard).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain('Sílabos por entregar');
    expect(wrapper.text()).not.toContain('Continuar mis sílabos');
    expect(wrapper.get('[aria-label="Mis sílabos"]').text()).toContain('Álgebra Lineal');
  });

  it('al abrir un sílabo enviado avisa que cargue como documento', async () => {
    vi.mocked(getTeacherSyllabi).mockResolvedValue({ ...syllabi, syllabi: { ...syllabi.syllabi, data: [{ ...syllabi.syllabi.data[0]!, state: 'en_revision' }] } });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[aria-label="Abrir sílabo de Álgebra Lineal"]').trigger('click');
    expect(router.push).toHaveBeenCalledWith({ path: '/docente/mis-silabos/s1', state: { syllabusPreview: true } });
  });

  it('la tarjeta no muestra el último guardado', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const card = wrapper.get('[aria-label="Mis sílabos"]').text();
    expect(card).not.toContain('Último guardado');
    expect(card).not.toContain('Sin guardados');
  });

  it('acomoda hasta tres tarjetas por fila', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get('[aria-label="Mis sílabos"]').classes()).toContain('lg:grid-cols-3');
  });

  it('muestra la paginación cuando hay más de una página', async () => {
    vi.mocked(getTeacherSyllabi).mockResolvedValue({ ...syllabi, syllabi: { ...syllabi.syllabi, last_page: 2, total: 30, from: 1, to: 15 } });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('1–15 de 30');
    expect(wrapper.find('[aria-label="Paginación de mis sílabos"]').exists()).toBe(true);
  });

  it('vuelve a pedir los sílabos al filtrar', async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(getTeacherSyllabi).toHaveBeenCalledTimes(2);
  });
});
