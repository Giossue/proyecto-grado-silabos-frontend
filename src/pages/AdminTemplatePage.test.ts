import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { typeConfirmation } from '@/test/confirmPhrase';
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from "@/api/session";
import { checkTemplateDraft, createTemplate, getTemplate, getTemplateJson, getTemplateTeacherPreview, previewTemplateDraft, type TemplatePayload } from "@/api/template";
import { applyTemplateAssistantProposal, discardTemplateAssistantProposal, getTemplateAssistant, getTemplateAssistantProposal, sendTemplateAssistantMessage } from "@/api/templateAssistant";

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
  return { useAvatarController: () => ({ state: ref({}) }) };
});

vi.mock("@/api/template", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/template")>()),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  getTemplateJson: vi.fn(),
  getTemplateTeacherPreview: vi.fn(),
  previewTemplateDraft: vi.fn(),
  checkTemplateDraft: vi.fn(),
  getTemplateDraftImpact: vi.fn(),
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
        { id: 'field-1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
        { id: 'field-2', key: 'sin_nombre', label: '', quien_llena: 'carrera', content: { type: 'doc', content: [{ type: 'paragraph' }] } },
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
    vi.mocked(getTemplateAssistant).mockResolvedValue({ available: true, locked: false, suggestions: [], messages: [] });
    vi.mocked(sendTemplateAssistantMessage).mockResolvedValue({ message: 'El pedido quedó registrado.', assistant_message_id: 'a-1' });
    vi.mocked(applyTemplateAssistantProposal).mockResolvedValue({ message: 'Propuesta aplicada en el editor.' });
    vi.mocked(discardTemplateAssistantProposal).mockResolvedValue({ message: 'Propuesta descartada.' });
    vi.mocked(checkTemplateDraft).mockResolvedValue({ problems: [] });
  });

  it('pasa al editor qué tablas repetibles se pueden abrir en el diseñador', async () => {
    const blockDesigns = { unidades: { design: null, reason: 'Tiene listas o grupos dentro de cada fila. Para cambiarla use Opciones avanzadas → Editar JSON.' } };
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, blockDesigns });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findComponent({ name: 'TemplateVisualBuilder' }).props('blockDesigns')).toEqual(blockDesigns);
  });

  it('al editar, «Ver como docente» muestra el formulario del borrador sin guardar', async () => {
    const doc = { type: 'doc' as const, content: [{ type: 'paragraph' }] };
    vi.mocked(previewTemplateDraft).mockResolvedValue({ sheets: [], sections: [{
      id: 'nuevo', key: 'descripcion', title: 'Descripción del borrador', description: null, orientation: 'portrait',
      fields: [{ id: 'nuevo-1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', teacher_editable: true, required: true, value: doc, document: doc }],
    }] } as never);
    vi.mocked(getTemplateTeacherPreview).mockClear();
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await flushPromises();
    typeConfirmation('template-edit-confirm', 'editar plantilla');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();

    await wrapper.get('button[aria-label="Ver como docente"]').trigger('click');
    await flushPromises();

    expect(getTemplateTeacherPreview).not.toHaveBeenCalled();
    expect(previewTemplateDraft).toHaveBeenCalledWith('template-1', expect.objectContaining({ version: 1, title: 'PROGRAMA DE ASIGNATURA (SÍLABO)', sections: [expect.objectContaining({ key: 'descripcion' })] }));
    expect(wrapper.text()).toContain('Vista de prueba del borrador sin guardar');
    expect(wrapper.find('section.teacher-form').text()).toContain('Descripción del borrador');
  });

  it('«Ver como docente» cambia la hoja por el formulario del docente con la plantilla guardada, y se puede volver', async () => {
    const doc = { type: 'doc' as const, content: [{ type: 'paragraph' }] };
    vi.mocked(getTemplateTeacherPreview).mockResolvedValue({ sections: [{
      id: 'section-1', key: 'descripcion', title: 'Descripción de la asignatura', description: null, orientation: 'portrait',
      fields: [{ id: 'field-1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', teacher_editable: true, required: true, value: doc, document: doc }],
    }] } as never);
    const wrapper = mountPage();
    await flushPromises();
    const toggle = () => wrapper.get('button[aria-label="Ver como docente"]');

    await toggle().trigger('click');
    await flushPromises();
    expect(getTemplateTeacherPreview).toHaveBeenCalledWith('template-1');
    expect(wrapper.text()).toContain('Vista de prueba: así verá el formulario el docente. Lo que escriba aquí no se guarda');
    expect(wrapper.find('section.teacher-form').text()).toContain('Descripción');
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(false);
    // La hoja de la plantilla queda oculta mientras se ve el formulario.
    expect((wrapper.find('[data-sheet]').element.closest('[style*="display: none"]'))).not.toBeNull();

    await toggle().trigger('click');
    await flushPromises();
    expect(wrapper.find('section.teacher-form').exists()).toBe(false);
    expect(wrapper.findAll('button').some((button) => button.text() === 'Editar')).toBe(true);
  });

  const proposal = (version: string) => ({
    id: 'p-1', status: 'pendiente' as const, draft_version: version, changes: ['Nuevo campo «Competencias» en «Descripción de la asignatura».'],
    changed: { sections: [], fields: ['competencias'] },
    sections: [{ key: 'descripcion', title: 'Descripción de la asignatura', orientation: 'portrait' as const, fields: [
      { key: 'descripcion', label: 'Descripción', quien_llena: 'carrera' as const, content: { type: 'doc' as const, content: [{ type: 'paragraph' }] } },
      { key: 'sin_nombre', label: '', quien_llena: 'carrera' as const, content: { type: 'doc' as const, content: [{ type: 'paragraph' }] } },
      { key: 'competencias', label: 'Competencias', quien_llena: 'carrera' as const, content: { type: 'doc' as const, content: [{ type: 'paragraph' }] } },
    ] }],
  });

  const askAssistant = async (wrapper: ReturnType<typeof mountPage>): Promise<string> => {
    await flushPromises();
    expect(wrapper.findAll('button').some((button) => button.text() === 'Asistente')).toBe(false);
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await flushPromises();
    typeConfirmation('template-edit-confirm', 'editar plantilla');
    await flushPromises();
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Continuar')!.click();
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Asistente')!.trigger('click');
    await flushPromises();
    await wrapper.get('#template-assistant-message').setValue('Agrega Competencias');
    await wrapper.get('#template-assistant-message').element.closest('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();
    const sent = vi.mocked(sendTemplateAssistantMessage).mock.calls[0]![1];
    expect(sent.sections.map((section) => section.key)).toEqual(['descripcion']);
    return sent.version;
  };

  it("solo al editar ofrece el asistente, que pone la propuesta en el editor sin guardarla", async () => {
    vi.mocked(getTemplateAssistant).mockImplementation(async () => {
      const version = vi.mocked(sendTemplateAssistantMessage).mock.calls[0]?.[1].version;
      return { available: true, locked: false, suggestions: [], messages: version ? [{ id: 'a-1', role: 'asistente', status: 'completado', result: 'propuesta', content: 'Propongo Competencias.', error: null, created_at: '2026-10-31T10:00:00Z', proposal: { id: 'p-1', status: 'pendiente', changes: proposal(version).changes, draft_version: version } }] : [] };
    });
    const wrapper = mountPage();
    const version = await askAssistant(wrapper);
    vi.mocked(getTemplateAssistantProposal).mockResolvedValue(proposal(version));

    await wrapper.get('[data-proposal]').findAll('button').find((button) => button.text() === 'Aplicar')!.trigger('click');
    await flushPromises();

    expect(applyTemplateAssistantProposal).toHaveBeenCalledWith('p-1');
    const changed = wrapper.findAll('[data-changed]');
    expect(changed).toHaveLength(1);
    expect(changed[0]!.text()).toContain('Cambió');
    expect(changed[0]!.attributes('data-field')).toBeDefined();
    expect(wrapper.get<HTMLTextAreaElement>(`[data-field="${changed[0]!.attributes('data-field')}"] [data-field-label] textarea`).element.value).toBe('Competencias');
    expect(getTemplate).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[aria-label="Cinta de edición de la plantilla"] [data-unsaved]').exists()).toBe(true);
  });

  it("no aplica una propuesta si el borrador cambió después del pedido", async () => {
    vi.mocked(getTemplateAssistant).mockImplementation(async () => {
      const version = vi.mocked(sendTemplateAssistantMessage).mock.calls[0]?.[1].version;
      return { available: true, locked: false, suggestions: [], messages: version ? [{ id: 'a-1', role: 'asistente', status: 'completado', result: 'propuesta', content: 'Listo.', error: null, created_at: '2026-10-31T10:00:00Z', proposal: { id: 'p-1', status: 'pendiente', changes: ['Uno.'], draft_version: version } }] : [] };
    });
    vi.mocked(getTemplateAssistantProposal).mockResolvedValue(proposal('otra:1'));
    const wrapper = mountPage();
    await askAssistant(wrapper);

    await wrapper.get('[data-proposal]').findAll('button').find((button) => button.text() === 'Aplicar')!.trigger('click');
    await flushPromises();

    expect(applyTemplateAssistantProposal).not.toHaveBeenCalled();
    expect(wrapper.find('[data-changed]').exists()).toBe(false);
  });

  it("lista las secciones con sus campos, incluso el que no tiene nombre", async () => {
    const wrapper = mountPage();
    await flushPromises();
    await wrapper.findAll('button').find((button) => button.text() === 'Editar')!.trigger('click');
    await flushPromises();
    typeConfirmation('template-edit-confirm', 'editar plantilla');
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
    typeConfirmation('template-edit-confirm', 'editar plantilla');
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

  it("avisa que reanudar adapta los sílabos si la plantilla cambió durante la pausa", async () => {
    vi.mocked(getTemplate).mockResolvedValue({ ...payload, templateChangedDuringPause: true });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Al reanudar el proceso, los sílabos de este período se adaptan a la plantilla');
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
    typeConfirmation('template-edit-confirm', 'editar plantilla');
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
