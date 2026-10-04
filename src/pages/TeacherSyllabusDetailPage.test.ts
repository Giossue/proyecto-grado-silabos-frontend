import { defineComponent, h } from 'vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import FreeTextEditor from "@/components/domain/syllabus/FreeTextEditor.vue";
import { copyTeacherSyllabus, getTeacherSyllabus, saveTeacherField, submitTeacherSyllabus, validateTeacherSyllabus, type SyllabusDetail, startTeacherSyllabus } from "@/api/syllabi";
import { ApiError } from "@/api/client";
import { handleUnauthorized } from "@/lib/unauthorized";

const routeLeaveGuards: Array<() => Promise<boolean> | boolean> = [];

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { syllabus: "syllabus-1" } }),
  useRouter: () => ({ replace: vi.fn() }),
  onBeforeRouteLeave: (guard: () => Promise<boolean> | boolean) => routeLeaveGuards.push(guard),
}));

vi.mock("@/lib/unauthorized", () => ({ handleUnauthorized: vi.fn() }));

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

const syllabus = (state: "borrador" | "en_revision" | "correccion_solicitada", type = "texto_largo"): SyllabusDetail => ({
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
    blocks: [{
      id: "block-1",
      title: "Contenido",
      content_type: "text",
      fields: [{
        id: "field-1",
        key: "contenido",
        label: "Contenido",
        help: null,
        type,
        options: [],
        required: true,
        inherited: false,
        teacher_editable: true,

        value: type === "booleano" ? null : "Texto enviado",
      }],
    }],
  }],
  observations: [],
});

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
    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(wrapper.get(".syllabus-readonly-field").text()).toContain("Texto enviado");
  });

  it("el Texto libre se escribe con su editor y se guarda como documento", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "texto_libre");
    detail.sections[0]!.blocks[0]!.fields[0]!.value = null;
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

  it("guarda No como booleano explícito y no como campo vacío", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador", "booleano") });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
    const wrapper = mountPage();
    await flushPromises();

    const options = wrapper.findAll('.boolean-options [role="radio"]');
    expect(options).toHaveLength(2);
    expect(
      options.every((option) => option.attributes('aria-checked') === 'false'),
    ).toBe(true);
    await options[1]!.trigger('click');
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledWith(
      "syllabus-1",
      "field-1",
      2,
      false,
    );
  });

  it("muestra un campo solo cuando se cumple su condición y no borra lo escrito", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "booleano");
    detail.sections[0]!.blocks[0]!.fields.push({
      id: "field-2", key: "detalle", label: "Tipo de discapacidad", help: null, type: "texto_corto",
      options: [], show_when: { key: "contenido", value: "true" }, required: true, inherited: false,
      teacher_editable: true, value: "Visual",
    });
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find("#field-field-2").exists()).toBe(false);
    const options = wrapper.findAll('.boolean-options [role="radio"]');
    await options[0]!.trigger("click");
    expect(wrapper.get("#input-field-2").element).toHaveProperty("value", "Visual");

    await wrapper.findAll('.boolean-options [role="radio"]')[1]!.trigger("click");
    expect(wrapper.find("#field-field-2").exists()).toBe(false);
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();
    expect(saveTeacherField).toHaveBeenCalledTimes(1);
    expect(saveTeacherField).toHaveBeenCalledWith("syllabus-1", "field-1", 2, false);
  });

  it("guarda una selección múltiple como una lista de valores", async () => {
    vi.useFakeTimers();
    const draft = syllabus("borrador", "seleccion_multiple");
    const field = draft.sections[0]!.blocks[0]!.fields[0]!;
    field.options = [
      { value: "etica", label: "Ética" },
      { value: "datos", label: "Datos" },
    ];
    field.value = [];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.findAll('[role="checkbox"]')[1]!.trigger('click');
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledWith(
      "syllabus-1",
      "field-1",
      2,
      ["datos"],
    );
  });

  it("muestra las observaciones de coordinación sin pedir respuesta al docente", async () => {
    const draft = syllabus("correccion_solicitada");
    draft.observations = [{
      id: "observation-1",
      content: "Aclare el resultado.",
      state: "pendiente",
      requested: true,
    }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Observaciones de coordinación");
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

    await wrapper.get("textarea").setValue("Cambio local");
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
      blocks: [{
        id: "review-block",
        title: "Firmas",
        content_type: "fixed",
          document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Firma del coordinador" }] }] },
        fields: [],
      }],
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
    expect(wrapper.text()).toContain("Firma del coordinador");
    expect(wrapper.text()).not.toContain("Resultados de validación");
    expect(wrapper.text()).toContain("está vacío");
    expect(wrapper.findAll("button").some((button) => button.text() === "Validar sílabo")).toBe(false);
  });

  const buttonNamed = (wrapper: ReturnType<typeof mountPage>, name: string) =>
    wrapper.findAll("button").find((button) => button.text().includes(name));

  it("deshabilita Enviar mientras algún campo del docente sigue vacío", async () => {
    const draft = syllabus("borrador");
    draft.sections[0].blocks[0].fields[0].value = "";
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar sílabo");
    expect(send).toBeDefined();
    expect(send!.attributes("disabled")).toBeDefined();
    // El aviso de campos faltantes ya no se muestra como texto; solo en el tooltip de Enviar.
    expect(wrapper.find(".submit-hint").exists()).toBe(false);

    await wrapper.get("#input-field-1").setValue("Contenido");
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
    expect(document.body.textContent).toContain("¿Enviar a Coordinación?");
    const confirm = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Enviar a Coordinación"));
    expect(confirm).toBeDefined();
    confirm!.click();
    await flushPromises();

    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2);
    expect(wrapper.find(".submit-feedback").exists()).toBe(false);
    expect(buttonNamed(wrapper, "Ir a la primera")).toBeUndefined();
    expect(wrapper.get(".feedback.error").text()).toContain("Falta el dato institucional de créditos.");
    expect(wrapper.get(".feedback.error").text()).not.toContain("Completa «Contenido».");
    expect(wrapper.text()).not.toContain("Pulse cada una");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("true");

    await wrapper.get("#input-field-1").setValue("Contenido nuevo");
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
    // La cabecera ya no repite el nombre de la asignatura.
    expect(wrapper.get("header").text()).not.toContain("Inteligencia Artificial");
    expect(buttonNamed(wrapper, "Iniciar borrador")).toBeUndefined();
    expect(wrapper.text()).not.toContain("Listo para iniciar");
    expect(wrapper.find("textarea, [contenteditable='true'], input").exists()).toBe(true);
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

  it("pasa a solo lectura si un guardado es rechazado por pausa", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("This action is unauthorized.", 403));
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get("textarea").setValue("Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.find("textarea").exists()).toBe(false);
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

    await wrapper.get("textarea").setValue("Cambio local");
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(wrapper.get(".save-status").text()).toContain("Sin guardar");
    await buttonNamed(wrapper, "Reintentar")!.trigger("click");
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledTimes(2);
    expect(saveTeacherField).toHaveBeenLastCalledWith("syllabus-1", "field-1", 2, "Cambio local");
    expect(wrapper.find(".save-status").exists()).toBe(false);
  });

  it("lleva al inicio de sesión si un guardado falla por sesión caducada", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("CSRF token mismatch.", 419));
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get("textarea").setValue("Cambio local");
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

    await wrapper.get("textarea").setValue("Antes de salir");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    const allowed = await routeLeaveGuards[0]!();

    expect(allowed).toBe(true);
    expect(saveTeacherField).toHaveBeenCalledWith("syllabus-1", "field-1", 2, "Antes de salir");
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

    await wrapper.get("textarea").setValue("Antes de salir");
    const leaving = routeLeaveGuards[0]!();
    await flushPromises();
    const choice = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((item) => item.textContent?.trim() === button);
    expect(choice).toBeDefined();
    choice!.click();
    await flushPromises();
    expect(await leaving).toBe(allowed);
    wrapper.unmount();
  });

  it("durante la corrección de biblioteca solo deja editar la bibliografía y reenvía sin pasar por coordinación", async () => {
    const detail = syllabus("correccion_solicitada");
    detail.sections[0]!.blocks[0]!.fields[0]!.value = "";
    detail.sections.push({
      id: "section-2",
      key: "bibliografia",
      title: "Bibliografía",
      description: null,
      blocks: [{
        id: "block-2",
        title: "Bibliografía",
        content_type: "text",
        fields: [{
          id: "field-2",
          key: "bibliografia_basica",
          label: "Bibliografía básica",
          help: null,
          type: "texto_largo",
          options: [],
          required: true,
          inherited: false,
          teacher_editable: true,
          value: "Sommerville, 10.ª ed.",
        }],
      }],
    });
    detail.library_correction = true;
    detail.reopening = { cause: "La 10.ª edición no está disponible.", reopened_at: "2026-09-29T09:00:00-05:00", reopened_by: "Biblioteca Demo", origin: "biblioteca" };
    detail.library_comments = [
      { comment: "Comentario anterior.", commented_at: "2026-09-20T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 1 },
      { comment: "La 10.ª edición no está disponible.", commented_at: "2026-09-29T09:00:00-05:00", commented_by: "Biblioteca Demo", revision_number: 2 },
    ];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    vi.mocked(submitTeacherSyllabus).mockResolvedValue({ message: "Bibliografía reenviada.", syllabus: { ...detail, state: "aprobado", library_correction: false } });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find("#input-field-1").exists()).toBe(false);
    expect(wrapper.get("#field-field-1").classes()).toContain("syllabus-readonly-field");
    expect(wrapper.find("#input-field-2").exists()).toBe(true);
    expect(wrapper.get(".library-correction").text()).toContain("Solo puede cambiar la sección Bibliografía");
    const commentCard = wrapper.get(".library-comment-card");
    expect(commentCard.text()).toContain("Comentario de biblioteca");
    expect(commentCard.text().indexOf("La 10.ª edición no está disponible.")).toBeLessThan(commentCard.text().indexOf("Comentario anterior."));

    const resend = buttonNamed(wrapper, "Reenviar bibliografía");
    expect(resend).toBeDefined();
    expect(resend!.attributes("disabled")).toBeUndefined();
    expect(buttonNamed(wrapper, "Enviar sílabo")).toBeUndefined();
    await resend!.trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("¿Reenviar la bibliografía?");
    expect(document.body.textContent).toContain("sin pasar por la revisión de coordinación");
    expect(document.body.textContent).toContain("vuelve a biblioteca para su verificación");
    const confirm = Array.from(document.body.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent?.includes("Reenviar bibliografía"));
    (confirm as HTMLButtonElement).click();
    await flushPromises();

    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2);
    wrapper.unmount();
  });
});
