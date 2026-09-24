import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import {
  getTeacherSyllabus,
  saveTeacherField,
  saveTeacherRows,
  submitTeacherSyllabus,
  validateTeacherSyllabus,
  type SyllabusDetail,
} from "@/api/syllabi";
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
  getTeacherSyllabus: vi.fn(),
  saveTeacherField: vi.fn(),
  saveTeacherRows: vi.fn(),
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
  identification: [],
  sections: [{
    id: "section-1",
    key: "descripcion",
    title: "Descripción",
    description: null,
    blocks: [{
      id: "block-1",
      title: "Contenido",
      content_type: "text",
      table: null,
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
        ai_enabled: false,
        value: type === "booleano" ? null : "Texto enviado",
        rows: [],
      }],
    }],
  }],
  observations: [],
});

const mountPage = () => mount(TeacherSyllabusDetailPage, {
  global: {
    stubs: {
      RouterLink: { template: "<a><slot /></a>" },
      SyllabusAiAssistantSheet: { template: "<div />" },
    },
  },
});

describe("TeacherSyllabusDetailPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(getTeacherSyllabus).mockReset();
    vi.mocked(saveTeacherField).mockReset();
    vi.mocked(saveTeacherRows).mockReset();
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

  it("mantiene la fila agregada tras guardarla aunque esté vacía y no pisa lo escrito durante el guardado", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "repetible");
    const block = detail.sections[0]!.blocks[0]!;
    block.content_type = "table";
    block.table = {
      columns: [{ key: "texto", label: "Elemento", type: "text", group: null, band: null, sum: false, width: null, role: null }],
      groups: [], bands: [], header_fields: [], totals: { enabled: false }, repeat: { enabled: false },
    };
    block.fields[0]!.label = "Objetivos específicos";
    block.fields[0]!.value = null;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: detail });
    let resolveSave: (value: Awaited<ReturnType<typeof saveTeacherRows>>) => void = () => {};
    vi.mocked(saveTeacherRows).mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find("table").exists()).toBe(false);
    expect(wrapper.text()).toContain("Objetivos específicos");
    const add = wrapper.findAll("button").find((button) => button.text() === "Agregar elemento")!;
    await add.trigger("click");
    await vi.advanceTimersByTimeAsync(700);
    expect(saveTeacherRows).toHaveBeenCalledTimes(1);

    await wrapper.get("textarea").setValue("Escrito mientras se guarda");
    // El servidor guarda la celda vacía como null.
    resolveSave({ version_bloqueo: 3, guardado_en: null, rows: [{ id: "row-1", data: { texto: null }, position: 1 }] });
    await flushPromises();

    expect(wrapper.findAll("textarea")).toHaveLength(1);
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).value).toBe("Escrito mientras se guarda");
    vi.mocked(saveTeacherRows).mockResolvedValue({ version_bloqueo: 4, guardado_en: null, rows: [{ id: "row-1", data: { texto: "Escrito mientras se guarda" }, position: 1 }] });
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();
    expect(saveTeacherRows).toHaveBeenLastCalledWith("syllabus-1", "field-1", 3, [{ id: "row-1", data: { texto: "Escrito mientras se guarda" }, position: 1 }]);
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

  it("muestra una parte solo cuando se cumple su condición y no borra lo escrito", async () => {
    vi.useFakeTimers();
    const detail = syllabus("borrador", "booleano");
    detail.sections[0]!.blocks[0]!.fields.push({
      id: "field-2", key: "detalle", label: "Tipo de discapacidad", help: null, type: "texto_corto",
      options: [], show_when: { key: "contenido", value: "true" }, required: true, inherited: false,
      teacher_editable: true, ai_enabled: false, value: "Visual", rows: [],
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
    // Solo se guarda la respuesta Sí/No; la parte oculta conserva su valor.
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
        table: null,
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

  it("deshabilita Enviar mientras alguna parte del docente sigue vacía", async () => {
    const draft = syllabus("borrador");
    draft.sections[0].blocks[0].fields[0].value = "";
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    const send = buttonNamed(wrapper, "Enviar sílabo");
    expect(send).toBeDefined();
    expect(send!.attributes("disabled")).toBeDefined();
    expect(wrapper.get(".submit-hint").text()).toBe("Falta 1 parte por completar");

    await wrapper.get("#input-field-1").setValue("Contenido");
    expect(send!.attributes("disabled")).toBeUndefined();
    expect(wrapper.find(".submit-hint").exists()).toBe(false);
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

    // Enviar pide confirmación antes de mandar el sílabo a Coordinación.
    expect(submitTeacherSyllabus).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("¿Enviar a Coordinación?");
    const confirm = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("Enviar a Coordinación"));
    expect(confirm).toBeDefined();
    confirm!.click();
    await flushPromises();

    expect(submitTeacherSyllabus).toHaveBeenCalledWith("syllabus-1", 2);
    // Aviso breve: cuenta partes (no mensajes); lo que no es de ninguna parte va en el aviso.
    expect(wrapper.get(".submit-feedback").text()).toContain("Falta 1 parte por completar. Está marcada en rojo.");
    expect(buttonNamed(wrapper, "Ir a la primera")).toBeDefined();
    expect(wrapper.get(".validation-errors").text()).toContain("Falta el dato institucional de créditos.");
    expect(wrapper.get(".validation-errors").text()).not.toContain("Completa «Contenido».");
    expect(wrapper.text()).not.toContain("Pulse cada una");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("true");

    // Al corregir la parte, su aviso rojo desaparece enseguida.
    await wrapper.get("#input-field-1").setValue("Contenido nuevo");
    expect(wrapper.get("#field-field-1").attributes("data-invalid")).toBe("false");
    expect(wrapper.get(".submit-feedback").text()).toContain("Revise lo siguiente antes de enviar.");
    expect(buttonNamed(wrapper, "Ir a la primera")).toBeUndefined();
    wrapper.unmount();
  });

  it("habilita la revisión con IA sin exigir una validación previa", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    const wrapper = mount(TeacherSyllabusDetailPage, {
      global: { stubs: { SyllabusAiAssistantSheet: { props: ["canReview"], template: '<div class="ai" :data-can-review="String(canReview)" />' } } },
    });
    await flushPromises();

    expect(wrapper.get(".ai").attributes("data-can-review")).toBe("true");
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

  it("pide confirmación al salir si lo pendiente no se pudo guardar", async () => {
    vi.useFakeTimers();
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("borrador") });
    vi.mocked(saveTeacherField).mockRejectedValue(new ApiError("Error temporal.", 500));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get("textarea").setValue("Antes de salir");
    const allowed = await routeLeaveGuards[0]!();

    expect(allowed).toBe(false);
    expect(confirm).toHaveBeenCalled();
    confirm.mockRestore();
    wrapper.unmount();
  });
});
