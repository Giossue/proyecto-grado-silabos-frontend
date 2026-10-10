import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from "@/api/session";
import { createTemplate, getTemplate, type TemplatePayload } from "@/api/template";

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
      orientation: 'portrait', fields: [
        { id: 'field-1', key: 'descripcion', label: 'Descripción', help: null, quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'field-2', key: 'sin_nombre', label: '', help: null, quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
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

  it("lista las secciones con sus campos, incluso el que no tiene nombre", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get<HTMLInputElement>('[data-section="section-1"] [aria-label="Sección Descripción de la asignatura"]').element.value).toBe('Descripción de la asignatura');
    expect(wrapper.get<HTMLInputElement>('[data-field="field-1"] input').element.value).toBe('Descripción');
    expect(wrapper.get<HTMLInputElement>('[aria-label="Nombre del campo Campo sin nombre"]').element.value).toBe('');
    expect(wrapper.find('[data-sheet], .template-sheet').exists()).toBe(true);
  });

  it("no tiene pestañas ni «Personalizar plantilla» y conserva los logos fijos", async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[role="tab"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Personalizar plantilla');
    expect(wrapper.text()).not.toContain('Vista previa');
    expect(wrapper.get('[data-sheet]').text()).not.toContain('Cambiar logo');
    expect(wrapper.find('input[type="file"]').exists()).toBe(false);
    expect(wrapper.get('[data-sheet] h2').classes()).toContain('template-sheet-title');
    expect(wrapper.find('[data-field="field-1"] .template-sheet-box').exists()).toBe(false);
  });

  it("pone la hoja directo sobre el fondo de la página, sin contenedor gris", async () => {
    const wrapper = mountPage();
    await flushPromises();

    const region = wrapper.get('[aria-label="Constructor visual de la plantilla del sílabo"]');
    expect(wrapper.find('.template-stage').exists()).toBe(false);
    expect(region.classes().some((name) => /^(bg-|rounded|p-|px-|py-)/.test(name))).toBe(false);
    const scrollRegion = wrapper.get('[aria-label="Hoja 1 de la plantilla con desplazamiento horizontal"]');
    expect(scrollRegion.classes()).toContain('overflow-x-auto');
    expect(scrollRegion.attributes('tabindex')).toBe('0');
    expect(scrollRegion.element.parentElement).toBe(region.element);
    expect(wrapper.get('[data-sheet]').element.parentElement).toBe(scrollRegion.element);
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
    expect(wrapper.text()).not.toContain('la plantilla no se puede cambiar');
    expect(wrapper.findAll('button').find((button) => button.text() === 'Nueva sección')).toBeUndefined();
    expect(wrapper.get('[aria-label="Eliminar el campo Descripción"]').attributes('disabled')).toBeDefined();
  });

  it("crea sola la plantilla vacía si no existe y muestra solo el título y los logos", async () => {
    vi.mocked(getTemplate)
      .mockReset()
      .mockResolvedValueOnce({ processLock: null, template: null })
      .mockResolvedValueOnce({ ...payload, template: { ...payload.template!, sections: [] } });
    vi.mocked(createTemplate).mockReset().mockResolvedValue({ message: 'Plantilla vacía creada.', template_id: 'template-1' });

    const wrapper = mountPage();
    await flushPromises();

    expect(createTemplate).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-sheet] h2').text()).toBe('PROGRAMA DE ASIGNATURA (SÍLABO)');
    expect(wrapper.findAll('[data-sheet] header img')).toHaveLength(2);
    expect(wrapper.find('[data-section]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Esta hoja está en blanco');
    expect(wrapper.find('button[aria-label="Restablecer a plantilla oficial"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Borrar la plantilla"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Exportar JSON"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Editar JSON"]').exists()).toBe(false);
  });
});
