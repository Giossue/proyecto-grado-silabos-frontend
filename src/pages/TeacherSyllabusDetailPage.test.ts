import RoleDeadlineBanner from '@/components/domain/RoleDeadlineBanner.vue';
import type { DocumentNode } from '@/lib/templateDocument';
import { setTemplateRuntime } from '@/lib/blocks/runtime';
import type { TemplateDefinitionPayload } from '@/lib/blocks/types';
import definition from '@/test/fixtures/template-definition.json';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import FreeTextEditor from "@/components/domain/syllabus/FreeTextEditor.vue";
import SyllabusDocumentPreview from "@/components/domain/syllabus/SyllabusDocumentPreview.vue";
import PageFrame from "@/components/domain/PageFrame.vue";
import { copyTeacherSyllabus, getTeacherSigningStatement, getTeacherSyllabus, saveTeacherField, submitTeacherSyllabus, validateTeacherSyllabus, type SyllabusDetail, type SyllabusField, startTeacherSyllabus } from "@/api/syllabi";
import type { StoredResponsible } from "@/types/configuration";
import { ApiError } from "@/api/client";
import { handleUnauthorized } from "@/lib/unauthorized";
import { makeTestP12 } from "@/lib/signature/testCertificate";
import { confirmSignatureDialog, fillSignatureDialog } from "@/test/signatureDialog";
import { updateFormation } from "@/api/session";
import { sessionState } from "@/state/session";
import { DIALOG_EXIT_MS } from "@/lib/dialogExit";

const routeLeaveGuards: Array<() => Promise<boolean> | boolean> = [];
const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { syllabus: "syllabus-1" }, fullPath: "/docente/silabos/syllabus-1" }),
  useRouter: () => ({ replace: vi.fn(), push: router.push }),
  onBeforeRouteLeave: (guard: () => Promise<boolean> | boolean) => routeLeaveGuards.push(guard),
}));

vi.mock("@/lib/unauthorized", () => ({ handleUnauthorized: vi.fn() }));

vi.mock("@/api/session", () => ({ getSession: vi.fn(), updateFormation: vi.fn() }));
vi.mock("@/api/support-documents", () => ({ getTeacherSupportDocuments: vi.fn(async () => ({ data: [] })), viewSupportDocument: vi.fn() }));

vi.mock("@/api/syllabi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/syllabi")>()),
  copyTeacherSyllabus: vi.fn(),
  getTeacherSigningStatement: vi.fn(),
  getTeacherSyllabus: vi.fn(),
  saveTeacherField: vi.fn(),
  startTeacherSyllabus: vi.fn(),
  submitTeacherSyllabus: vi.fn(),
  validateTeacherSyllabus: vi.fn(),
}));

const appearance = {
  font_family: "Arial",
  body_font_size: 11,
  title_font_size: 16,
  section_font_size: 13,
  field_font_size: 11,
  text_color: "#172033",
  accent_color: "#075da9",
  table_header_background: "#dbe6f4",
  table_header_color: "#315f92",
  margin_cm: 2.5,
  orientation: "portrait",
  title_bold: true,
  title_italic: false,
  title_alignment: "center",
  section_bold: true,
  section_italic: false,
  section_alignment: "left",
  body_alignment: "left",
};

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const field = (id: string, quien_llena: StoredResponsible = 'docente', overrides: Partial<SyllabusField> = {}): SyllabusField => ({
  id, key: `campo_${id}`, label: 'Contenido', quien_llena,
  required: true, teacher_editable: quien_llena === 'docente' || quien_llena === 'carrera', value: doc('Texto enviado'), ...overrides,
});

const syllabus = (state: "borrador" | "en_revision" | "correccion_solicitada", quien_llena: StoredResponsible = "docente"): SyllabusDetail => ({
  id: "syllabus-1",
  subject: "Inteligencia Artificial",
  code: "SW-01",
  convocation: "2026",
  period: "2026",
  state,
  version_bloqueo: 2,
  iniciado_en: "2026-09-10T00:00:00Z",
  parallels: ["A"],
  teachers: ["Docente"],
  presentation: {
    appearance,
    title: "PROGRAMA DE ASIGNATURA (SÍLABO)",
    logos: { institution: "/institution.png", faculty: "/faculty.png" },
  },
  sections: [{
    id: "section-1",
    key: "descripcion",
    title: "Descripción",
    description: null,
    orientation: "portrait",
    fields: [field("field-1", quien_llena, { key: "contenido" })],
  }],
});


const typeText = async (wrapper: ReturnType<typeof mountPage>, text: string, index = 0) => {
  wrapper.findAllComponents(FreeTextEditor)[index]!.vm.$emit("update:modelValue", doc(text));
  await flushPromises();
};

const buttonNamed = (wrapper: ReturnType<typeof mountPage>, name: string) =>
  wrapper.findAll("button").find((button) => button.text().includes(name) || button.attributes("aria-label") === name);

const PageWithTooltips = defineComponent({ setup: () => () => h(TooltipProvider, () => h(TeacherSyllabusDetailPage)) });
const mountPage = () => mount(PageWithTooltips, {
  global: {
    stubs: {
      RouterLink: { template: "<a><slot /></a>" },
      FreeTextEditor: { props: ["modelValue"], emits: ["update:modelValue"], template: "<div />" },
    },
  },
});

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement("style");
  style.dataset.exit = "";
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};

const openTab = async (wrapper: ReturnType<typeof mountPage>, title: string): Promise<void> => {
  const tab = wrapper.findAll('[role="tab"]').find((candidate) => candidate.text().includes(title));
  await tab!.trigger("mousedown", { button: 0 });
  await flushPromises();
};

describe("TeacherSyllabusDetailPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(copyTeacherSyllabus).mockReset();
    vi.mocked(getTeacherSyllabus).mockReset();
    vi.mocked(getTeacherSigningStatement).mockReset();
    vi.mocked(startTeacherSyllabus).mockReset();
    vi.mocked(saveTeacherField).mockReset();
    vi.mocked(submitTeacherSyllabus).mockReset();
    vi.mocked(validateTeacherSyllabus).mockReset();
    vi.mocked(handleUnauthorized).mockReset();
    routeLeaveGuards.length = 0;
    document.head.querySelectorAll("style[data-exit]").forEach((style) => style.remove());
  });

  it("presenta como documento de solo lectura una revisión enviada", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("en_revision") });
    const wrapper = mountPage();
    await flushPromises();

    const preview = wrapper.getComponent(SyllabusDocumentPreview);
    expect(preview.text()).toContain("PROGRAMA");
    expect(preview.text()).toContain("Texto enviado");
    expect(wrapper.findComponent(FreeTextEditor).exists()).toBe(false);
  });

  it("«Vista previa» muestra la hoja, queda presionado y al pulsarlo otra vez vuelve al formulario", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador", "docente") });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findComponent(SyllabusDocumentPreview).exists()).toBe(false);

    await buttonNamed(wrapper, "Vista previa")!.trigger("click");
    await flushPromises();
    expect(wrapper.findComponent(SyllabusDocumentPreview).exists()).toBe(true);
    expect(wrapper.find("#field-field-1").exists()).toBe(false);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(buttonNamed(wrapper, "Vista previa")!.attributes("aria-pressed")).toBe("true");

    await buttonNamed(wrapper, "Vista previa")!.trigger("click");
    expect(buttonNamed(wrapper, "Vista previa")!.attributes("aria-pressed")).toBe("false");
    expect(wrapper.findComponent(SyllabusDocumentPreview).exists()).toBe(false);
    expect(wrapper.find("#field-field-1").exists()).toBe(true);
    wrapper.unmount();
  });

  it("«Vista previa» guarda lo pendiente y muestra lo último que se escribió", async () => {
    const detail = syllabus("borrador", "docente");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null, document: doc("Texto nuevo") });
    const wrapper = mountPage();
    await flushPromises();

    wrapper.findComponent(FreeTextEditor).vm.$emit("update:modelValue", doc("Texto nuevo"));
    await buttonNamed(wrapper, "Vista previa")!.trigger("click");
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledWith("syllabus-1", "field-1", 2, doc("Texto nuevo"));
    const sections = wrapper.findComponent(SyllabusDocumentPreview).props("sections") as Array<{ fields: Array<{ document?: unknown }> }>;
    expect(sections[0]!.fields[0]!.document).toEqual(doc("Texto nuevo"));
    wrapper.unmount();
  });

  it("el campo de texto se escribe con su editor y se guarda como documento", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "docente");
    detail.sections[0]!.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();

    const editor = wrapper.findComponent(FreeTextEditor);
    expect(editor.exists()).toBe(true);
    const document = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Semana 1" }] }] }] }] };
    editor.vm.$emit("update:modelValue", document);
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledWith("syllabus-1", "field-1", 2, document);
  });

  it('guarda tablas libres y totales escritos sin calcularlos', async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus('borrador') });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();
    const document = { type: 'doc', content: [{ type: 'table', content: ['Semana adicional', '999'].map((text) => ({ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }] })) }] };
    wrapper.findComponent(FreeTextEditor).vm.$emit('update:modelValue', document);
    await vi.advanceTimersByTimeAsync(700);
    expect(saveTeacherField).toHaveBeenCalledWith('syllabus-1', 'field-1', 2, document);
    wrapper.unmount();
  });

  it('un campo Carrera sin espacios para el docente es de solo lectura', async () => {
    const detail = syllabus('borrador', 'carrera');
    detail.sections[0]!.fields[0]!.teacher_editable = false;
    detail.sections[0]!.fields.push(field('field-2', 'carrera', { label: 'Bibliografía' }));
    detail.sections[0]!.fields.push(field('field-3', 'carrera', { label: 'Herramientas TIC', teacher_editable: true }));
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.get('#field-field-1').element.closest('[data-slot="accordion-item"]')!.textContent).toContain('Carrera');
    expect(wrapper.findAllComponents(FreeTextEditor).map((editor) => editor.attributes('id'))).toEqual(['input-field-2', 'input-field-3']);
    expect(wrapper.text()).not.toContain('Viene del proyecto de carrera');
    wrapper.unmount();
  });

  it('cada campo es un acordeón que arranca abierto y se cierra y se vuelve a abrir', async () => {
    const detail = syllabus('borrador', 'docente');
    detail.sections[0]!.fields.push(field('field-2', 'docente', { label: 'Bibliografía' }));
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();
    const items = () => wrapper.findAll('[data-slot="accordion-item"]');
    const state = (index: number): string | undefined => items()[index]!.attributes('data-state');

    expect(items()).toHaveLength(2);
    expect([state(0), state(1)]).toEqual(['open', 'open']);

    await items()[1]!.get('[data-slot="accordion-trigger"]').trigger('click');
    await flushPromises();
    expect([state(0), state(1)]).toEqual(['open', 'closed']);

    await items()[1]!.get('[data-slot="accordion-trigger"]').trigger('click');
    await flushPromises();
    expect(state(1)).toBe('open');
    wrapper.unmount();
  });

  it('un campo sin nombre en la plantilla se muestra sin título, sin repetir el de la sección', async () => {
    const detail = syllabus('borrador', 'docente');
    detail.sections[0]!.fields = [field('field-1', 'docente', { label: '' })];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();

    const item = wrapper.get('[data-slot="accordion-item"]');
    expect(item.find('[data-slot="accordion-trigger"]').exists()).toBe(false);
    expect(item.attributes('data-state')).toBe('open');
    wrapper.unmount();
  });

  it("una sección sin campos del docente no aparece en el formulario y no cuenta como faltante", async () => {
    const detail = syllabus("borrador", "institucional");
    detail.sections[0]!.fields[0]!.value = doc("Software");
    detail.sections[0]!.fields[0]!.document = { type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "FACULTAD: Ciencias" }] }] }] }] }] };
    detail.sections[0]!.fields.push(field("field-2", "institucional", { key: "conducta", label: "Conducta ética", value: doc("Texto institucional") }));
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAllComponents(FreeTextEditor)).toHaveLength(0);
    expect(wrapper.find("#field-field-1").exists()).toBe(false);
    expect(wrapper.find("#field-field-2").exists()).toBe(false);
    expect(buttonNamed(wrapper, "Enviar")!.attributes("disabled")).toBeUndefined();
  });

  it("al reenviar sin cambios desde la corrección, la confirmación lo advierte sin impedir el envío", async () => {
    vi.useFakeTimers();
    const detail = { ...syllabus("correccion_solicitada"), unchanged_since_correction: true };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();

    await buttonNamed(wrapper, "Enviar")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("No ha cambiado nada desde que pidieron la corrección");
    const send = [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === "Enviar")!;
    expect(send.disabled).toBe(false);
    wrapper.unmount();

    const edited = mountPage();
    await flushPromises();
    await typeText(edited, "Arreglo pedido");
    await buttonNamed(edited, "Enviar")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).not.toContain("No ha cambiado nada desde que pidieron la corrección");
    edited.unmount();
  });

  it("el motivo por el que no se puede enviar se ve junto al botón, sin pasar el mouse", async () => {
    const detail = syllabus("borrador");
    detail.sections[0]!.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();

    const submit = buttonNamed(wrapper, "Enviar")!;
    expect(submit.attributes("disabled")).toBeDefined();
    const hint = wrapper.get("#submit-hint");
    expect(hint.text()).toBe("Falta 1 campo por completar");
    expect(submit.attributes("aria-describedby")).toBe("submit-hint");
    wrapper.unmount();
  });

  it("dos celdas de la misma fila de unidades se guardan aunque el primer guardado siga en curso", async () => {
    vi.useFakeTimers();
    setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, { horas_docencia: '64', horas_practicas: '0', horas_autonomas: '0', semanas_periodo: '16' });
    const week = () => ({ contenidos: "", acd_h: "", ape_h: "", aa_h: "", acd: "", ape: "", aa: "", evaluacion: "" });
    const units = Array.from({ length: 4 }, () => ({ nombre: "U", resultado: "R", semanas: Array.from({ length: 4 }, week) }));
    const detail = syllabus("borrador");
    detail.sections[0]!.fields[0]!.value = { type: "doc", content: [{ type: "documentBlock", attrs: { kind: "unidades", props: {}, value: { units } } }] };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    let finishFirst: () => void = () => undefined;
    vi.mocked(saveTeacherField)
      .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = () => resolve({ version_bloqueo: 3, guardado_en: null, document: doc("") }); }))
      .mockResolvedValue({ version_bloqueo: 4, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();
    const weekOf = (call: unknown[]) => ((call[3] as DocumentNode).content![0]!.attrs!.value as { units: Array<{ semanas: Array<Record<string, string>> }> }).units[0]!.semanas[0]!;

    await wrapper.get("#input-field-1-0-units-0-semanas-0-contenidos").setValue("Introducción");
    await vi.advanceTimersByTimeAsync(700);
    await wrapper.get("#input-field-1-0-units-0-semanas-0-acd_h").setValue("4");
    await vi.advanceTimersByTimeAsync(700);
    finishFirst();
    await flushPromises();
    await vi.advanceTimersByTimeAsync(0);

    const last = vi.mocked(saveTeacherField).mock.calls.at(-1)!;
    expect(last[2]).toBe(3);
    expect(weekOf(last)).toMatchObject({ contenidos: "Introducción", acd_h: "4" });
    wrapper.unmount();
  });

  it("no deja enviar mientras las horas de las unidades no sumen las de la asignatura", async () => {
    const week = (acd: string) => ({ contenidos: "", acd_h: acd, ape_h: "", aa_h: "", acd: "", ape: "", aa: "", evaluacion: "" });
    const units = (acd: string) => Array.from({ length: 4 }, (_, index) => ({ nombre: "U", resultado: "R", semanas: Array.from({ length: 4 }, (__, number) => week(index === 0 && number === 0 ? acd : "")) }));
    const planning = (acd: string): DocumentNode => ({ type: "doc", content: [{ type: "documentBlock", attrs: { kind: "unidades", props: {}, value: { units: units(acd) } } }] });
    setTemplateRuntime(definition as unknown as TemplateDefinitionPayload, { horas_docencia: '64', horas_practicas: '0', horas_autonomas: '0', semanas_periodo: '16' });

    const wrong = syllabus("borrador");
    wrong.sections[0]!.fields[0]!.value = planning("60");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: wrong });
    const first = mountPage();
    await flushPromises();
    expect(buttonNamed(first, "Enviar")!.attributes("disabled")).toBeDefined();
    first.unmount();

    const right = syllabus("borrador");
    right.sections[0]!.fields[0]!.value = planning("64");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: right });
    const second = mountPage();
    await flushPromises();
    expect(buttonNamed(second, "Enviar")!.attributes("disabled")).toBeUndefined();
    second.unmount();
  });

  it('formación y discapacidad son documentos docentes sin controles por sección', async () => {
    const detail = syllabus('borrador', 'institucional');
    detail.sections[0]!.fields.push(
      field('field-2', 'docente', { key: 'formacion_experiencia', label: 'Formación y experiencia' }),
      field('field-3', 'docente', { key: 'discapacidad', label: 'Estudiantes con discapacidad' }),
    );
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.findAllComponents(FreeTextEditor)).toHaveLength(2);
    expect(wrapper.find('#disability-choice').exists()).toBe(false);
    expect(wrapper.get('#field-field-2').classes()).not.toContain('border-l-2');
    wrapper.unmount();
    detail.state = 'en_revision';
    const readonly = mountPage();
    await flushPromises();
    expect(readonly.findAllComponents(FreeTextEditor)).toHaveLength(0);
    expect(readonly.getComponent(SyllabusDocumentPreview).text()).toContain('Texto enviado');
    readonly.unmount();
  });

  it("muestra el comentario general de coordinación, sin observaciones por campo", async () => {
    const draft = syllabus("correccion_solicitada");
    draft.review_comments = [{
      stage: "coordinacion",
      comment: "Aclare el resultado",
      commented_at: "2026-09-29T09:00:00-05:00",
      commented_by: "Coordinación Demo",
      revision_number: 1,
    }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get(".review-comment").text()).toContain("Coordinación pidió correcciones");
    expect(wrapper.get(".review-comment").text()).toContain("Aclare el resultado");
    expect(wrapper.find('button[aria-label="Comentarios"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Está preparando una nueva revisión");
    expect(wrapper.getComponent(PageFrame).props("hideIcon")).toBe(true);
    expect(wrapper.text()).not.toContain("Guardar respuesta");
    wrapper.unmount();
  });

  it("detiene el autoguardado y ofrece recarga ante un conflicto de versión", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(
      new ApiError("El borrador cambió", 409),
    );
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.get(".feedback.error").text()).toContain("otra sesión");
    expect(wrapper.get(".feedback.error button").text()).toBe("Recargar borrador");
  });

  it("deja la revisión final fuera del formulario, oculta el botón de validación y muestra los errores vigentes", async () => {
    const draft = syllabus("borrador");
    draft.sections.push({
      id: "section-review",
      key: "revision",
      title: "Revisión y aprobación",
      description: "Complete los campos aplicables",
      orientation: "portrait",
      fields: [field("review-field", "institucional", { key: "firmas", label: "Firmas", value: doc("Firma del coordinador") })],
    });
    draft.validation = {
      version_bloqueo: draft.version_bloqueo,
      blocking_errors: 1,
      warnings: 0,
      results: [{
        field_id: "field-1",
        code: "campo_obligatorio_faltante",
        severity: "error",
        message: "«Descripción de la asignatura» está vacío. Complétalo antes de enviar",
      }],
    };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Descripción");
    expect(wrapper.text()).not.toContain("Revisión y aprobación");
    expect(wrapper.text()).not.toContain("Resultados de validación");
    expect(wrapper.text()).toContain("está vacío");
    expect(wrapper.findAll("button").some((button) => button.text() === "Validar sílabo")).toBe(false);
  });

    it("deshabilita Enviar mientras algún campo del docente sigue vacío", async () => {
    const draft = syllabus("borrador");
    draft.sections[0]!.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar");
    expect(send).toBeDefined();
    expect(send!.attributes("disabled")).toBeDefined();

    expect(wrapper.find(".submit-hint").exists()).toBe(false);

    await typeText(wrapper, "Contenido");
    expect(send!.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".submit-hint").exists()).toBe(false);
    wrapper.unmount();
  });

  it("copia el contenido desde otro paralelo del docente tras confirmar", async () => {
    const draft = syllabus("borrador");
    draft.copy_sources = [{ id: "syllabus-2", parallel: "B", state: "borrador" }];
    const copied = syllabus("borrador");
    copied.version_bloqueo = 3;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(copyTeacherSyllabus).mockResolvedValue({ message: "Contenido copiado", syllabus: copied });
    const wrapper = mountPage();
    await flushPromises();

    await buttonNamed(wrapper, "Copiar desde paralelo B")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("¿Copiar desde el paralelo B?");
    const confirm = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((button) => button.textContent?.includes("Copiar contenido"));
    confirm!.click();
    await flushPromises();

    expect(copyTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", "syllabus-2", 2);
    expect(buttonNamed(wrapper, "Copiar desde paralelo B")).toBeUndefined();
    wrapper.unmount();
  });

  it("permite enviar sin validar antes y marca los errores bloqueantes que devuelve el servidor", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(submitTeacherSyllabus).mockRejectedValue(
      new ApiError("Corrija los errores", 422, { validation: ["Corrija los errores determinísticos antes de enviar"] }),
    );
    vi.mocked(validateTeacherSyllabus).mockResolvedValue({
      message: "Validación completada",
      validation: {
        version_bloqueo: 2,
        blocking_errors: 2,
        warnings: 0,
        results: [
          { field_id: "field-1", code: "campo_obligatorio_faltante", severity: "error", message: "Completa «Contenido»" },
          { field_id: "master-1", code: "dato_maestro_faltante", severity: "error", message: "Falta el dato institucional de créditos" },
        ],
      },
    });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar");
    expect(send).toBeDefined();
    await send!.trigger("click");
    await flushPromises();

    expect(submitTeacherSyllabus).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("¿Enviar a revisión?");
    const confirm = Array.from(document.body.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent?.trim() === "Enviar") as HTMLButtonElement | undefined;
    expect(confirm).toBeDefined();
    confirm!.click();
    await flushPromises();

    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2, expect.any(String), null);
    expect(getTeacherSigningStatement).not.toHaveBeenCalled();
    expect(wrapper.find(".submit-feedback").exists()).toBe(false);
    expect(buttonNamed(wrapper, "Ir a la primera")).toBeUndefined();
    expect(wrapper.get(".feedback.error").text()).toContain("Falta el dato institucional de créditos");
    expect(wrapper.get(".feedback.error").text()).not.toContain("Completa «Contenido»");
    expect(wrapper.text()).not.toContain("Pulse cada una");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("true");

    await typeText(wrapper, "Contenido nuevo");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("false");
    wrapper.unmount();
  });

  it("el docente no tiene asistente de IA", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    const wrapper = mount(PageWithTooltips);
    await flushPromises();

    expect(buttonNamed(wrapper, "Asistente")).toBeUndefined();
    expect(wrapper.find('aside[aria-label="Asistente de unidades"]').exists()).toBe(false);
  });

  it("al abrir un sílabo sin iniciar, inicia el borrador solo y muestra el formulario", async () => {
    const pending = syllabus("borrador");
    pending.state = "sin_iniciar" as SyllabusDetail["state"];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: pending });
    vi.mocked(startTeacherSyllabus).mockResolvedValue({ message: "Borrador iniciado", syllabus: syllabus("borrador") });
    const wrapper = mountPage();
    await flushPromises();

    expect(startTeacherSyllabus).toHaveBeenCalledWith(pending.id);
    expect(wrapper.get('[data-tour="page-header"]').text()).toContain("Volver a mis sílabos");

    expect(buttonNamed(wrapper, "Iniciar borrador")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Listo para iniciar");
    expect(wrapper.findComponent(FreeTextEditor).exists()).toBe(true);
  });

  it("usa el encabezado normal de la app: sin barra propia, sin repetir la franja de plazo y con Volver sobre el título", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('header[aria-label="Herramientas del sílabo"]').exists()).toBe(false);
    expect(wrapper.findComponent(RoleDeadlineBanner).exists()).toBe(false);
    expect(wrapper.get('[data-tour="page-header"]').text()).toContain("Volver a mis sílabos");
  });

  it("en pausa no ofrece iniciar ni repite el motivo: lo explica la franja", async () => {
    for (const state of ["sin_iniciar", "borrador"] as const) {
      const draft = syllabus("borrador");
      draft.state = state as SyllabusDetail["state"];
      draft.editable = false;
      draft.edit_block_reason = "La convocatoria está en pausa. Podrá seguir editando cuando se reanude";
      draft.edit_blocked_by_convocation = true;
      vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
      const wrapper = mountPage();
      await flushPromises();

      expect(buttonNamed(wrapper, "Iniciar borrador")).toBeUndefined();
      expect(wrapper.find(".edit-blocked").exists()).toBe(false);
      wrapper.unmount();
    }
  });

  it("un borrador de una convocatoria finalizada se ve como formulario, sin poder editarlo", async () => {
    const draft = syllabus("borrador");
    draft.editable = false;
    draft.edit_block_reason = "La convocatoria finalizó";
    draft.edit_blocked_by_convocation = true;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find("#field-field-1").exists()).toBe(true);
    expect(wrapper.find("section.teacher-form").exists()).toBe(true);
    expect(buttonNamed(wrapper, "Firmar y enviar")).toBeUndefined();
    wrapper.unmount();
  });

  it("un bloqueo que no es de la convocatoria sí muestra su motivo", async () => {
    const draft = syllabus("borrador");
    draft.editable = false;
    draft.edit_block_reason = "No tiene una asignación vigente para editar este sílabo";
    draft.edit_blocked_by_convocation = false;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get(".edit-blocked").text()).toContain("No tiene una asignación vigente");
  });

  it("queda sin poder editar, con el mismo aspecto, si un guardado es rechazado por pausa", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("This action is unauthorized", 403));
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.findComponent(FreeTextEditor).vm.$attrs.disabled).toBe(true);
    expect(wrapper.get(".edit-blocked").text()).toContain("La convocatoria está en pausa. Podrá seguir editando cuando se reanude");
    expect(buttonNamed(wrapper, "Enviar")).toBeUndefined();
  });

  it("deja el campo pendiente tras un fallo y lo reenvía con Reintentar", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField)
      .mockRejectedValueOnce(new ApiError("Error temporal", 500))
      .mockResolvedValueOnce({ version_bloqueo: 3, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.get(".save-status").text()).toContain("Sin guardar");
    await buttonNamed(wrapper, "Reintentar")!.trigger("click");
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledTimes(2);
    expect(saveTeacherField).toHaveBeenLastCalledWith("syllabus-1", "field-1", 2, doc("Cambio local"));
    expect(wrapper.find(".save-status").exists()).toBe(false);
  });

  it("lleva al inicio de sesión si un guardado falla por sesión caducada", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("CSRF token mismatch", 419));
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(handleUnauthorized).toHaveBeenCalled();
    expect(wrapper.get(".save-status").text()).toContain("Sin guardar");
  });

  it("guarda lo pendiente al salir de la página en lugar de descartarlo", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null, document: doc("") });
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Antes de salir");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    const allowed = await routeLeaveGuards[0]!();

    expect(allowed).toBe(true);
    expect(saveTeacherField).toHaveBeenCalledWith("syllabus-1", "field-1", 2, doc("Antes de salir"));
    wrapper.unmount();
  });

  it.each([
    { button: "Seguir editando", allowed: false },
    { button: "Salir y descartar cambios", allowed: true },
  ])("pide confirmación al fallar el guardado y permite decidir: $button", async ({ button, allowed }) => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("Error temporal", 500));
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Antes de salir");
    const leaving = routeLeaveGuards[0]!();
    await flushPromises();
    const choice = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((item) => item.textContent?.trim() === button);
    expect(choice).toBeDefined();
    choice!.click();
    await flushPromises();
    expect(await leaving).toBe(allowed);
    wrapper.unmount();
  });

  it("marca con asterisco todo campo del docente: en el sílabo todos son obligatorios", async () => {
    const detail = syllabus("borrador", "docente");
    detail.sections[0]!.fields[0]!.required = false;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find("#field-field-1").text()).toContain("*");
    wrapper.unmount();
  });

  it("«Siguiente» y «Anterior» recorren las secciones como las pestañas", async () => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    const detail = syllabus("borrador", "docente");
    detail.sections.push({
      id: "section-2",
      key: "bibliografia",
      title: "Bibliografía",
      description: null,
      orientation: "portrait",
      fields: [field("field-2", "docente", { key: "bibliografia_basica", label: "Bibliografía básica" })],
    });
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();
    expect(buttonNamed(wrapper, "Anterior")).toBeUndefined();
    expect(buttonNamed(wrapper, "Siguiente")!.element.closest(".teacher-form")).toBeNull();

    await buttonNamed(wrapper, "Siguiente")!.trigger("click");
    await flushPromises();
    expect(wrapper.find("#field-field-2").exists()).toBe(true);
    expect(wrapper.find("#field-field-1").exists()).toBe(false);
    expect(buttonNamed(wrapper, "Siguiente")).toBeUndefined();

    await buttonNamed(wrapper, "Anterior")!.trigger("click");
    await flushPromises();
    expect(wrapper.find("#field-field-1").exists()).toBe(true);
    wrapper.unmount();
  });

  it("tras un comentario de biblioteca el docente edita todo el sílabo y lo reenvía a revisión", async () => {
    const detail = syllabus("correccion_solicitada");
    detail.sections.push({
      id: "section-2",
      key: "bibliografia",
      title: "Bibliografía",
      description: null,
      orientation: "portrait",
      fields: [field("field-2", "docente", { key: "bibliografia_basica", label: "Bibliografía básica" })],
    });
    detail.review_comments = [
      { stage: "biblioteca", comment: "Comentario anterior", commented_at: "2026-09-20T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 1 },
      { stage: "biblioteca", comment: "La 10.ª edición no está disponible", commented_at: "2026-09-29T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 2 },
    ];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();


    expect(wrapper.find("#input-field-1").exists()).toBe(true);
    await openTab(wrapper, "Bibliografía");
    expect(wrapper.find("#input-field-2").exists()).toBe(true);
    expect(wrapper.find(".library-correction").exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Comentarios"]').exists()).toBe(false);
    expect(wrapper.find(".review-comment").text()).toContain("La 10.ª edición no está disponible");
    expect(wrapper.text()).not.toContain("Comentario anterior");
    expect(buttonNamed(wrapper, "Reenviar bibliografía")).toBeUndefined();
    expect(buttonNamed(wrapper, "Enviar")).toBeDefined();
    await buttonNamed(wrapper, "Enviar")!.trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("¿Enviar a revisión?");
    expect(document.body.textContent).toContain("Asegúrese de haber hecho los arreglos que pidió Biblioteca");
    expect(document.body.textContent).not.toContain("Pasa directo a biblioteca");
    wrapper.unmount();
  });

  it("sin formación y experiencia no deja entrar al sílabo: pide configurarla en un modal y la guarda", async () => {
    const teacherSession = (formation: string | null) => ({
      user: { id: "u-1", name: "DOCENTE UNO", email: "docente@ueb.edu.ec", email_verified: true, can_edit_identity: false, formation },
      active_role: { id: "r-1", code: "docente" as const, career_id: null, career_name: null },
      available_roles: [],
    });
    sessionState.replace(teacherSession(null));
    vi.mocked(updateFormation).mockResolvedValue(teacherSession("Magíster en Tecnología"));
    const draft = syllabus("borrador");
    draft.teacher_formation_required = true;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(document.body.textContent).toContain("Complete su formación y experiencia");
    expect(document.body.querySelector('[data-test="leave-formation-button"]')).not.toBeNull();
    expect(document.body.querySelector('[data-test="cancel-formation-button"]')).toBeNull();
    expect(buttonNamed(wrapper, "Formación y experiencia")).toBeUndefined();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Complete su formación y experiencia");
    const textarea = document.body.querySelector<HTMLTextAreaElement>("#dialog-formation")!;
    textarea.value = "Magíster en Tecnología";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    document.body.querySelector<HTMLButtonElement>('[data-test="save-formation-button"]')!.click();
    await flushPromises();

    expect(updateFormation).toHaveBeenCalledWith("Magíster en Tecnología");
    expect(getTeacherSyllabus).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toContain("Complete su formación y experiencia");
    expect(buttonNamed(wrapper, "Enviar")!.attributes("disabled")).toBeUndefined();
    wrapper.unmount();
    sessionState.clear();
  });

  it("mientras carga un sílabo enviado muestra la hoja del documento", async () => {
    window.history.replaceState({ syllabusPreview: true }, "");
    vi.mocked(getTeacherSyllabus).mockReturnValue(new Promise(() => undefined));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-skeleton="preview-sheet"]').exists()).toBe(true);
    window.history.replaceState(null, "");
    wrapper.unmount();
  });

  it("al primer envío firma la declaración y envía con la firma", async () => {
    const draft = syllabus("borrador");
    draft.teacher_signature_required = true;
    const sent = syllabus("en_revision");
    sent.signatures = [{ role: "docente", name: "Docente Demo", signed_at: "2026-09-16T10:00:00Z" }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(getTeacherSigningStatement).mockResolvedValue({ statement: "silabos-ueb|silabo:syllabus-1|accion:envio_docente|huella:abc", required: true });
    vi.mocked(submitTeacherSyllabus).mockResolvedValue({ message: "Enviado", syllabus: sent });
    const wrapper = mountPage();
    await flushPromises();

    expect(buttonNamed(wrapper, "Enviar")).toBeUndefined();
    await buttonNamed(wrapper, "Firmar y enviar")!.trigger("click");
    await flushPromises();
    await fillSignatureDialog(makeTestP12("DOCENTE DEMO", "clave"), "clave");
    await confirmSignatureDialog();

    expect(getTeacherSigningStatement).toHaveBeenCalledWith("syllabus-1", 2);
    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2, expect.any(String), {
      statement: "silabos-ueb|silabo:syllabus-1|accion:envio_docente|huella:abc",
      cms: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
    });
    // Vuelve a la lista cuando el diálogo terminó de cerrarse.
    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith("/docente/mis-silabos"));
    wrapper.unmount();
  });

  it("muestra en el diálogo el error de firma del envío", async () => {
    const draft = syllabus("borrador");
    draft.teacher_signature_required = true;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(getTeacherSigningStatement).mockResolvedValue({ statement: "silabos-ueb|silabo:syllabus-1|accion:envio_docente|huella:abc", required: true });
    vi.mocked(submitTeacherSyllabus).mockRejectedValue(new ApiError("Datos inválidos", 422, { signature: ["El certificado está vencido"] }));
    const wrapper = mountPage();
    await flushPromises();

    await buttonNamed(wrapper, "Firmar y enviar")!.trigger("click");
    await flushPromises();
    await fillSignatureDialog(makeTestP12("DOCENTE DEMO", "clave"), "clave");
    await confirmSignatureDialog();

    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("El certificado está vencido");
    expect(wrapper.find(".feedback.error").exists()).toBe(false);
    wrapper.unmount();
  });

  it("el sílabo aprobado se ve como documento con su PDF", async () => {
    const approved = { ...syllabus("en_revision"), state: "aprobado" as const, approved_revision_id: "revision-9" };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: approved });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findComponent(SyllabusDocumentPreview).exists()).toBe(true);
    expect(buttonNamed(wrapper, "Ver PDF")).toBeDefined();
    expect(buttonNamed(wrapper, "Asistente")).toBeUndefined();
    expect(wrapper.find('a[href*="documentos"]').exists()).toBe(false);
    expect(buttonNamed(wrapper, "Firmar")).toBeUndefined();
    wrapper.unmount();
  });

  it("al copiar, el diálogo se desvanece nombrando todavía el paralelo", async () => {
    simulateExitAnimation();
    const draft = syllabus("borrador");
    draft.copy_sources = [{ id: "syllabus-2", parallel: "B", state: "borrador" }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(copyTeacherSyllabus).mockResolvedValue({ message: "Contenido copiado", syllabus: syllabus("borrador") });
    const wrapper = mountPage();
    await flushPromises();
    await buttonNamed(wrapper, "Copiar desde paralelo B")!.trigger("click");
    await flushPromises();
    const dialog = (): HTMLElement => Array.from(document.body.querySelectorAll<HTMLElement>('[role="dialog"]')).find((item) => item.textContent?.includes("Copiar contenido"))!;

    Array.from(dialog().querySelectorAll("button")).find((button) => button.textContent?.includes("Copiar contenido"))!.click();
    await flushPromises();

    expect(dialog().dataset.state).toBe("closed");
    expect(dialog().textContent).toContain("¿Copiar desde el paralelo B?");
    wrapper.unmount();
  });

  it("tras enviar, vuelve a la lista solo cuando el diálogo terminó de cerrarse", async () => {
    router.push.mockClear();
    const sent = syllabus("en_revision");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(submitTeacherSyllabus).mockResolvedValue({ message: "Enviado", syllabus: sent });
    const wrapper = mountPage();
    await flushPromises();
    await buttonNamed(wrapper, "Enviar")!.trigger("click");
    await flushPromises();

    (Array.from(document.body.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent?.trim() === "Enviar") as HTMLButtonElement).click();
    await flushPromises();
    expect(submitTeacherSyllabus).toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, DIALOG_EXIT_MS));
    await flushPromises();
    expect(router.push).toHaveBeenCalledWith("/docente/mis-silabos");
    wrapper.unmount();
  });
});
