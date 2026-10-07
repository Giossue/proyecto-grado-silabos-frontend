import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from "@/api/session";
import { createTemplate, formatTemplate, getTemplate, type TemplatePayload } from "@/api/template";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({ fullPath: '/administracion/plantilla' }),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));

vi.mock("@/api/template", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/template")>()),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  formatTemplate: vi.fn(),
  uploadInstitutionLogo: vi.fn(),
}));

const payload: TemplatePayload = {
  processLock: null,
  logos: {
    institution: '/logo.png', faculty: '/faculty.png',
    institution_size: { width: 120, height: 40 }, faculty_size: { width: 120, height: 40 },
  },
  template: {
    id: "template-1",
    name: "Plantilla institucional",
    description: null,
    titleBlock: { text: "PROGRAMA DE ASIGNATURA (SÍLABO)" },
    sections: [{
      id: "section-1", key: "descripcion", title: "Descripción de la asignatura", description: null,
      blocks: [
        { id: "block-1", key: "descripcion", title: "Descripción", fields: [{ id: "field-1", block_id: "block-1", key: "descripcion", label: "Descripción", help: null, type: "texto", config: [] }] },
        { id: "block-2", key: "sin_nombre", title: "", fields: [{ id: "field-2", block_id: "block-2", key: "sin_nombre", label: "", help: null, type: "texto", config: [] }] },
      ],
    }],
  },
};

const mountPage = () => mount({
  components: { AdminTemplatePage, TooltipProvider },
  template: '<TooltipProvider><AdminTemplatePage /></TooltipProvider>',
}, { attachTo: document.body });

describe("AdminTemplatePage", () => {
  enableAutoUnmount(afterEach);

  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", name: "Administración", email: "admin@ueb.edu.ec", email_verified: true, can_edit_identity: true },
      active_role: { id: "role-1", code: "administrador", career_id: null, career_name: null },
      available_roles: [],
    });
    vi.mocked(getTemplate).mockReset();
    vi.mocked(getTemplate).mockResolvedValue(payload);
  });

  it("lista las secciones numeradas con sus campos, incluso el que no tiene nombre", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get('[data-section="section-1"] h3').text()).toBe('1. Descripción de la asignatura');
    expect(wrapper.get('[data-field="field-1"]').text()).toContain('Descripción');
    const unnamed = wrapper.get('[data-field="field-2"]');
    expect(unnamed.text()).toContain('Campo sin nombre');
    await unnamed.get('button').trigger('click');
    expect(unnamed.get('button').attributes('aria-pressed')).toBe('true');
  });

  it("muestra la vista previa del sílabo con las vistas de cada tipo", async () => {
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.findAll('[role="tab"]').find((tab) => tab.text() === 'Vista previa')!.trigger('mousedown');
    await flushPromises();
    const preview = document.body.querySelector('[aria-label="Vista previa del sílabo"]');
    expect(preview?.textContent).toContain('PROGRAMA DE ASIGNATURA (SÍLABO)');
    expect(preview?.textContent).toContain('1. Descripción de la asignatura');
  });

  it("avisa que reanudar rehace los sílabos si la plantilla cambió durante la pausa", async () => {
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, templateChangedDuringPause: true });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Al reanudar el proceso, todos los sílabos de este período se rehacen desde cero.');
  });

  it("sincroniza una mutación sin desmontar el constructor", async () => {
    vi.mocked(getTemplate).mockReset();
    vi.mocked(getTemplate)
      .mockResolvedValueOnce(payload)
      .mockResolvedValueOnce({ ...payload, template: { ...payload.template!, titleBlock: { text: "OTRO TÍTULO" } } });
    const wrapper = mountPage();
    await flushPromises();

    const editor = wrapper.get('[aria-label="Constructor visual de la plantilla del sílabo"]').element;
    window.dispatchEvent(new CustomEvent('silabos:template-changed'));
    await flushPromises();

    expect(getTemplate).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[aria-label="Constructor visual de la plantilla del sílabo"]').element).toBe(editor);
    expect(wrapper.text()).toContain('OTRO TÍTULO');
  });

  it("bloquea los cambios con un proceso abierto y lo explica", async () => {
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, processLock: 'Hay un proceso abierto' });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Edición bloqueada');
    expect(wrapper.text()).toContain('la plantilla no se puede cambiar');
    const nueva = wrapper.findAll('button').find((button) => button.text() === 'Nueva sección');
    expect(nueva!.attributes('disabled')).toBeDefined();
    expect(wrapper.get('[aria-label="Eliminar el campo Descripción"]').attributes('disabled')).toBeDefined();
  });

  it("crea una plantilla vacía sin instalar el formato oficial", async () => {
    vi.mocked(getTemplate)
      .mockReset()
      .mockResolvedValueOnce({ processLock: null, template: null })
      .mockResolvedValueOnce(payload);
    vi.mocked(createTemplate).mockResolvedValue({ message: 'Plantilla vacía creada.', template_id: 'template-1' });

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(createTemplate).toHaveBeenCalledOnce();
  });

  it("aplica el formato oficial únicamente desde una plantilla vacía", async () => {
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, template: { ...payload.template!, sections: [] } });
    vi.mocked(formatTemplate).mockResolvedValue({ message: 'Formato oficial aplicado.' });

    const wrapper = mountPage();
    await flushPromises();

    const formatButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Cargar formato oficial UEB');
    expect(formatButton).toBeDefined();
    await formatButton!.trigger('click');
    await flushPromises();

    expect(formatTemplate).toHaveBeenCalledWith('template-1');
  });
});
