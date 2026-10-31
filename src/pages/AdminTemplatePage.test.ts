import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from "@/api/session";
import { createTemplate, getTemplate, getTemplateJson, type TemplatePayload } from "@/api/template";
import { applyTemplateAssistantProposal, discardTemplateAssistantProposal, getTemplateAssistant, getTemplateAssistantProposal } from "@/api/templateAssistant";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({ fullPath: '/administracion/plantilla' }),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));
vi.mock("@/api/templateAssistant", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/templateAssistant")>()),
  getTemplateAssistant: vi.fn(),
  sendTemplateAssistantMessage: vi.fn(),
  clearTemplateAssistant: vi.fn(),
  getTemplateAssistantProposal: vi.fn(),
  applyTemplateAssistantProposal: vi.fn(),
  discardTemplateAssistantProposal: vi.fn(),
}));
vi.mock("@/components/domain/ai/avatar/useAvatarController", async () => {
  const { ref } = await import("vue");
  return { useAvatarController: () => ({ state: ref({}), applyAgentHint: vi.fn() }) };
});
vi.mock("@/composables/useCountdown", async () => {
  const { ref } = await import("vue");
  return { useCountdown: () => ref(0) };
});

vi.mock("@/api/template", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/template")>()),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  getTemplateJson: vi.fn(),

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
      id: "section-1", key: "descripcion", title: "Descripción de la asignatura",
      orientation: 'portrait', fields: [
        { id: 'field-1', key: 'descripcion', label: 'Descripción', quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'field-2', key: 'sin_nombre', label: '', quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
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
    vi.mocked(getTemplateAssistant).mockResolvedValue({
      available: true, locked: false, suggestions: [],
      messages: [{ id: 'a-1', role: 'asistente', status: 'completado', result: 'propuesta', content: 'Propongo Competencias.', error: null, created_at: '2026-10-31T10:00:00Z', proposal: { id: 'p-1', status: 'pendiente', changes: ['Nuevo campo «Competencias» en «Descripción de la asignatura».'] } }],
    });
    vi.mocked(getTemplateAssistantProposal).mockResolvedValue({
      id: 'p-1', status: 'pendiente', changes: ['Nuevo campo «Competencias» en «Descripción de la asignatura».'],
      changed: { sections: [], fields: ['competencias'] },
      sections: [{ key: 'descripcion', title: 'Descripción de la asignatura', orientation: 'portrait', fields: [
        { key: 'descripcion', label: 'Descripción', quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { key: 'competencias', label: 'Competencias', quien_llena: 'docente', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
      ] }],
    });
    vi.mocked(applyTemplateAssistantProposal).mockResolvedValue({ message: 'Propuesta aplicada a la plantilla.' });
    vi.mocked(discardTemplateAssistantProposal).mockResolvedValue({ message: 'Propuesta descartada.' });
  });

  const openProposal = async (wrapper: ReturnType<typeof mountPage>) => {
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Asistente')!.trigger('click');
    await flushPromises();
    await wrapper.get('[data-proposal] button').trigger('click');
    await flushPromises();
  };

  it("muestra la propuesta del asistente en la hoja con los cambios marcados y la aplica tras confirmar", async () => {
    const wrapper = mountPage();
    await openProposal(wrapper);

    expect(getTemplateAssistantProposal).toHaveBeenCalledWith('p-1');
    const changed = wrapper.findAll('[data-changed]');
    expect(changed).toHaveLength(1);
    expect(changed[0]!.text()).toContain('Competencias');
    expect(changed[0]!.text()).toContain('Cambió');
    expect(wrapper.find('[data-proposal-bar]').text()).toContain('Propuesta del asistente');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(false);

    await wrapper.get('[data-proposal-bar]').findAll('button').find((button) => button.text() === 'Aplicar')!.trigger('click');
    await flushPromises();
    expect(document.body.textContent).toContain('Al reanudar una convocatoria en pausa, sus sílabos se rehacen desde cero');
    [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Aplicar')!.click();
    await flushPromises();

    expect(applyTemplateAssistantProposal).toHaveBeenCalledWith('p-1');
    expect(getTemplate).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-proposal-bar]').exists()).toBe(false);
    expect(wrapper.find('[data-changed]').exists()).toBe(false);
  });

  it("descarta la propuesta y vuelve a la plantilla", async () => {
    const wrapper = mountPage();
    await openProposal(wrapper);

    await wrapper.get('[data-proposal-bar]').findAll('button').find((button) => button.text() === 'Descartar')!.trigger('click');
    await flushPromises();

    expect(discardTemplateAssistantProposal).toHaveBeenCalledWith('p-1');
    expect(applyTemplateAssistantProposal).not.toHaveBeenCalled();
    expect(wrapper.find('[data-proposal-bar]').exists()).toBe(false);
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(true);
  });

  it("lista las secciones con sus campos, incluso el que no tiene nombre", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();

    expect(wrapper.get<HTMLTextAreaElement>('[data-section="section-1"] [aria-label="Sección Descripción de la asignatura"]').element.value).toBe('Descripción de la asignatura');
    expect(wrapper.get<HTMLTextAreaElement>('[data-field="field-1"] [data-field-label] textarea').element.value).toBe('Descripción');
    expect(wrapper.findAll('[data-field-editor]')).toHaveLength(2);
    expect(wrapper.find('[aria-label="Nombre del campo Campo sin nombre"]').exists()).toBe(false);
    expect(wrapper.find('[data-sheet], .template-sheet').exists()).toBe(true);
  });

  it("al editar muestra el encabezado con «Volver a la vista» y al volver lo quita", async () => {
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('header[aria-label="Herramientas de la plantilla"]').exists()).toBe(false);
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();

    const back = wrapper.findAll('header[aria-label="Herramientas de la plantilla"] button').find((button) => button.text() === 'Volver a la vista')!;
    await back.trigger('click');
    await flushPromises();
    expect(wrapper.find('header[aria-label="Herramientas de la plantilla"]').exists()).toBe(false);
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
    expect(wrapper.findAll('button').find((button) => button.text() === 'Editar')!.attributes('disabled')).toBeDefined();
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

  it("abre el JSON de la plantilla desde Opciones avanzadas", async () => {
    vi.mocked(getTemplateJson).mockReset().mockResolvedValue({ version: 2, sections: [] });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAll('button').some((item) => item.attributes('aria-label') === 'Opciones avanzadas')).toBe(false);
    await wrapper.findAll('button').find((item) => item.text().includes('Editar'))!.trigger('click');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();

    const button = wrapper.find('[data-template-ribbon]').findAll('button').find((item) => item.attributes('aria-label') === 'Opciones avanzadas')!;
    await button.trigger('keydown', { key: 'Enter' });
    await flushPromises();
    document.body.querySelector<HTMLElement>('[role="menuitem"]')!.click();
    await flushPromises();

    expect(document.body.textContent).toContain('Plantilla como JSON');
    expect(getTemplateJson).toHaveBeenCalledWith('template-1');
  });
});
