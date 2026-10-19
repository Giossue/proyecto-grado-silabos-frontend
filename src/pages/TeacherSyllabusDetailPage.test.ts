import type { DocumentNode } from '@/lib/templateDocument';
import { setBlockLayouts } from '@/lib/blockLayouts';
import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import FreeTextEditor from "@/components/domain/syllabus/FreeTextEditor.vue";
import { copyTeacherSyllabus, getTeacherSyllabus, saveTeacherField, submitTeacherSyllabus, validateTeacherSyllabus, type SyllabusDetail, type SyllabusField, startTeacherSyllabus } from "@/api/syllabi";
import type { FieldResponsible } from "@/types/configuration";
import { ApiError } from "@/api/client";
import { handleUnauthorized } from "@/lib/unauthorized";

const routeLeaveGuards: Array<() => Promise<boolean> | boolean> = [];

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { syllabus: "syllabus-1" }, fullPath: "/docente/silabos/syllabus-1" }),
  useRouter: () => ({ replace: vi.fn() }),
  onBeforeRouteLeave: (guard: () => Promise<boolean> | boolean) => routeLeaveGuards.push(guard),
}));

vi.mock("@/lib/unauthorized", () => ({ handleUnauthorized: vi.fn() }));

vi.mock("@/api/session", () => ({ getSession: vi.fn(), updateFormation: vi.fn() }));

vi.mock("@/api/syllabi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/syllabi")>()),
  copyTeacherSyllabus: vi.fn(),
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
const field = (id: string, quien_llena: FieldResponsible = 'docente', overrides: Partial<SyllabusField> = {}): SyllabusField => ({
  id, key: `campo_${id}`, label: 'Contenido', quien_llena,
  required: true, teacher_editable: quien_llena === 'docente', value: doc('Texto enviado'), ...overrides,
});

const syllabus = (state: "borrador" | "en_revision" | "correccion_solicitada", quien_llena: FieldResponsible = "docente"): SyllabusDetail => ({
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
  wrapper.findAll("button").find((button) => button.text().includes(name));

const PageWithTooltips = defineComponent({ setup: () => () => h(TooltipProvider, () => h(TeacherSyllabusDetailPage)) });
const mountPage = () => mount(PageWithTooltips, {
  global: {
    stubs: {
      RouterLink: { template: "<a><slot /></a>" },
      SyllabusUnitAssistant: { template: "<div />" },
      FreeTextEditor: { props: ["modelValue"], emits: ["update:modelValue"], template: "<div />" },
    },
  },
});

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
    vi.mocked(startTeacherSyllabus).mockReset();
    vi.mocked(saveTeacherField).mockReset();
    vi.mocked(submitTeacherSyllabus).mockReset();
    vi.mocked(validateTeacherSyllabus).mockReset();
    vi.mocked(handleUnauthorized).mockReset();
    routeLeaveGuards.length = 0;
  });

  it("presenta como documento de solo lectura una revisión enviada", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("en_revision") });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get(".syllabus-document-header").text()).toContain("PROGRAMA");
    expect(wrapper.findComponent(FreeTextEditor).exists()).toBe(false);
    expect(wrapper.get(".syllabus-readonly-field").text()).toContain("Texto enviado");
  });

  it("el campo de texto se escribe con su editor y se guarda como documento", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "docente");
    detail.sections[0]!.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
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
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
    const wrapper = mountPage();
    await flushPromises();
    const document = { type: 'doc', content: [{ type: 'table', content: ['Semana adicional', '999'].map((text) => ({ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }] })) }] };
    wrapper.findComponent(FreeTextEditor).vm.$emit('update:modelValue', document);
    await vi.advanceTimersByTimeAsync(700);
    expect(saveTeacherField).toHaveBeenCalledWith('syllabus-1', 'field-1', 2, document);
    wrapper.unmount();
  });

  it('Carrera es de solo lectura incluso si otro indicador permite editar', async () => {
    const detail = syllabus('borrador', 'coordinacion');
    detail.sections[0]!.fields[0]!.teacher_editable = true;
    detail.sections[0]!.fields.push(field('field-2', 'docente', { label: 'Bibliografía' }));
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.get('#field-field-1').text()).toContain('Carrera');
    expect(wrapper.findAllComponents(FreeTextEditor)).toHaveLength(1);
    expect(wrapper.findComponent(FreeTextEditor).attributes('id')).toBe('input-field-2');
    wrapper.unmount();
  });

  it("el dato automático y el texto fijo son de solo lectura y no cuentan como faltantes", async () => {
    const detail = syllabus("borrador", "institucional");
    detail.sections[0]!.fields[0]!.value = doc("Software");
    detail.sections[0]!.fields[0]!.document = { type: "doc", content: [{ type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "FACULTAD: Ciencias" }] }] }] }] }] };
    detail.sections[0]!.fields.push(field("field-2", "institucional", { key: "conducta", label: "Conducta ética", value: doc("Texto institucional") }));
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findAllComponents(FreeTextEditor)).toHaveLength(0);
    expect(wrapper.get("#field-field-1").text()).toContain("FACULTAD: Ciencias");
    expect(wrapper.get("#field-field-2").text()).toContain("Texto institucional");
    expect(buttonNamed(wrapper, "Enviar sílabo")!.attributes("disabled")).toBeUndefined();
  });

  it("no deja enviar mientras las horas de las unidades no sumen las de la asignatura", async () => {
    const week = (acd: string) => ({ contenidos: "", acd_h: acd, ape_h: "", aa_h: "", acd: "", ape: "", aa: "", evaluacion: "" });
    const units = (acd: string) => Array.from({ length: 4 }, (_, index) => ({ nombre: "U", resultado: "R", semanas: Array.from({ length: 4 }, (__, number) => week(index === 0 && number === 0 ? acd : "")) }));
    const planning = (acd: string): DocumentNode => ({ type: "doc", content: [{ type: "documentBlock", attrs: { kind: "unidades", props: {}, value: { units: units(acd) } } }] });
    setBlockLayouts({ unidades: { weeks: 16, hours: { acd: 64, ape: 0, aa: 0 } } });

    const wrong = syllabus("borrador");
    wrong.sections[0]!.fields[0]!.value = planning("60");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: wrong });
    const first = mountPage();
    await flushPromises();
    expect(buttonNamed(first, "Enviar sílabo")!.attributes("disabled")).toBeDefined();
    first.unmount();

    const right = syllabus("borrador");
    right.sections[0]!.fields[0]!.value = planning("64");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: right });
    const second = mountPage();
    await flushPromises();
    expect(buttonNamed(second, "Enviar sílabo")!.attributes("disabled")).toBeUndefined();
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
    expect(readonly.get('#field-field-2').text()).toContain('Texto enviado');
    expect(readonly.get('#field-field-3').text()).toContain('Texto enviado');
    readonly.unmount();
  });

  it("muestra el comentario general de coordinación, sin observaciones por campo", async () => {
    const draft = syllabus("correccion_solicitada");
    draft.review_comments = [{
      stage: "coordinacion",
      comment: "Aclare el resultado.",
      commented_at: "2026-09-29T09:00:00-05:00",
      commented_by: "Coordinación Demo",
      revision_number: 1,
    }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Comentario de Coordinación");
    expect(wrapper.text()).toContain("Aclare el resultado.");
    expect(wrapper.text()).not.toContain("Guardar respuesta");
  });

  it("detiene el autoguardado y ofrece recarga ante un conflicto de versión", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(
      new ApiError("El borrador cambió.", 409),
    );
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.get(".feedback.error").text()).toContain("otra sesión");
    expect(wrapper.get(".feedback.error button").text()).toBe("Recargar borrador");
  });

  it("muestra la revisión final como contenido fijo, oculta el botón de validación y muestra los errores vigentes", async () => {
    const draft = syllabus("borrador");
    draft.sections.push({
      id: "section-review",
      key: "revision",
      title: "Revisión y aprobación",
      description: "Complete los campos aplicables.",
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
        message: "«Descripción de la asignatura» está vacío. Complétalo antes de enviar.",
      }],
    };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Descripción");
    expect(wrapper.text()).toContain("Revisión y aprobación");
    expect(wrapper.text()).not.toContain("Resultados de validación");
    expect(wrapper.text()).toContain("está vacío");
    await openTab(wrapper, "Revisión y aprobación");
    expect(wrapper.text()).toContain("Firma del coordinador");
    expect(wrapper.findAll("button").some((button) => button.text() === "Validar sílabo")).toBe(false);
  });

    it("deshabilita Enviar mientras algún campo del docente sigue vacío", async () => {
    const draft = syllabus("borrador");
    draft.sections[0]!.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar sílabo");
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
    vi.mocked(copyTeacherSyllabus).mockResolvedValue({ message: "Contenido copiado.", syllabus: copied });
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
      new ApiError("Corrija los errores.", 422, { validation: ["Corrija los errores determinísticos antes de enviar."] }),
    );
    vi.mocked(validateTeacherSyllabus).mockResolvedValue({
      message: "Validación completada.",
      validation: {
        version_bloqueo: 2,
        blocking_errors: 2,
        warnings: 0,
        results: [
          { field_id: "field-1", code: "campo_obligatorio_faltante", severity: "error", message: "Completa «Contenido»." },
          { field_id: "master-1", code: "dato_maestro_faltante", severity: "error", message: "Falta el dato institucional de créditos." },
        ],
      },
    });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar sílabo");
    expect(send).toBeDefined();
    await send!.trigger("click");
    await flushPromises();

    expect(submitTeacherSyllabus).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("¿Enviar a revisión?");
    const confirm = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Enviar a revisión"));
    expect(confirm).toBeDefined();
    confirm!.click();
    await flushPromises();

    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2, expect.any(String));
    expect(wrapper.find(".submit-feedback").exists()).toBe(false);
    expect(buttonNamed(wrapper, "Ir a la primera")).toBeUndefined();
    expect(wrapper.get(".feedback.error").text()).toContain("Falta el dato institucional de créditos.");
    expect(wrapper.get(".feedback.error").text()).not.toContain("Completa «Contenido».");
    expect(wrapper.text()).not.toContain("Pulse cada una");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("true");

    await typeText(wrapper, "Contenido nuevo");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("false");
    wrapper.unmount();
  });

  it("habilita la generación de unidades sin exigir una validación previa", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    const wrapper = mount(PageWithTooltips, {
      global: { stubs: { SyllabusUnitAssistant: { props: ["enabled"], template: '<div class="ai" :data-enabled="String(enabled)" />' } } },
    });
    await flushPromises();

    expect(wrapper.get(".ai").attributes("data-enabled")).toBe("true");
  });

  it("al abrir un sílabo sin iniciar, inicia el borrador solo y muestra el formulario", async () => {
    const pending = syllabus("borrador");
    pending.state = "sin_iniciar" as SyllabusDetail["state"];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: pending });
    vi.mocked(startTeacherSyllabus).mockResolvedValue({ message: "Borrador iniciado.", syllabus: syllabus("borrador") });
    const wrapper = mountPage();
    await flushPromises();

    expect(startTeacherSyllabus).toHaveBeenCalledWith(pending.id);
    expect(wrapper.get("header").text()).toContain("Volver a mis sílabos");

    expect(wrapper.get("header").text()).not.toContain("Inteligencia Artificial");
    expect(buttonNamed(wrapper, "Iniciar borrador")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Listo para iniciar");
    expect(wrapper.findComponent(FreeTextEditor).exists()).toBe(true);
  });

  it("muestra el motivo y no ofrece iniciar cuando la convocatoria está en pausa", async () => {
    const draft = syllabus("borrador");
    draft.state = "sin_iniciar" as SyllabusDetail["state"];
    draft.editable = false;
    draft.edit_block_reason = "La convocatoria está en pausa. Podrá seguir editando cuando se reanude.";
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(buttonNamed(wrapper, "Iniciar borrador")).toBeUndefined();
    expect(wrapper.get(".edit-blocked").text()).toContain("en pausa");
  });

  it("queda sin poder editar, con el mismo aspecto, si un guardado es rechazado por pausa", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("This action is unauthorized.", 403));
    const wrapper = mountPage();
    await flushPromises();

    await typeText(wrapper, "Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.findComponent(FreeTextEditor).vm.$attrs.disabled).toBe(true);
    expect(wrapper.get(".edit-blocked").text()).toContain("La convocatoria está en pausa. Podrá seguir editando cuando se reanude.");
    expect(buttonNamed(wrapper, "Enviar sílabo")).toBeUndefined();
  });

  it("deja el campo pendiente tras un fallo y lo reenvía con Reintentar", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField)
      .mockRejectedValueOnce(new ApiError("Error temporal.", 500))
      .mockResolvedValueOnce({ version_bloqueo: 3, guardado_en: null });
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
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("CSRF token mismatch.", 419));
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
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
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
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("Error temporal.", 500));
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
      { stage: "biblioteca", comment: "Comentario anterior.", commented_at: "2026-09-20T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 1 },
      { stage: "biblioteca", comment: "La 10.ª edición no está disponible.", commented_at: "2026-09-29T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 2 },
    ];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    const wrapper = mountPage();
    await flushPromises();


    expect(wrapper.find("#input-field-1").exists()).toBe(true);
    await openTab(wrapper, "Bibliografía");
    expect(wrapper.find("#input-field-2").exists()).toBe(true);
    expect(wrapper.find(".library-correction").exists()).toBe(false);
    const commentCard = wrapper.get(".library-comment-card");
    expect(commentCard.text()).toContain("Comentario de Biblioteca");
    expect(commentCard.text()).toContain("irá directo a biblioteca");
    expect(commentCard.text().indexOf("La 10.ª edición no está disponible.")).toBeLessThan(commentCard.text().indexOf("Comentario anterior."));
    expect(buttonNamed(wrapper, "Reenviar bibliografía")).toBeUndefined();
    expect(buttonNamed(wrapper, "Enviar sílabo")).toBeDefined();
    wrapper.unmount();
  });

});
