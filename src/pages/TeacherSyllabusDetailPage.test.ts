import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import {
  getTeacherSyllabus,
  requestAiReview,
  respondObservation,
  saveTeacherField,
  validateTeacherSyllabus,
  type SyllabusDetail,
} from "@/api/syllabi";
import { ApiError } from "@/api/client";

vi.mock("vue-router", () => ({
  useRoute: () => ({ params: { syllabus: "syllabus-1" } }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/api/syllabi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/syllabi")>()),
  getTeacherSyllabus: vi.fn(),
  saveTeacherField: vi.fn(),
  saveTeacherRows: vi.fn(),
  startTeacherSyllabus: vi.fn(),
  validateTeacherSyllabus: vi.fn(),
  submitTeacherSyllabus: vi.fn(),
  requestAiReview: vi.fn(),
  respondObservation: vi.fn(),
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

const syllabus = (state: "borrador" | "en_revision" | "correccion_solicitada", type = "markdown"): SyllabusDetail => ({
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
    vi.mocked(validateTeacherSyllabus).mockReset();
    vi.mocked(requestAiReview).mockReset();
    vi.mocked(respondObservation).mockReset();
  });

  it("presenta como documento de solo lectura una revisión enviada", async () => {
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: syllabus("en_revision") });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get(".syllabus-document-header").text()).toContain("PROGRAMA");
    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(wrapper.get(".syllabus-readonly-field").text()).toContain("Texto enviado");
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

  it("envía la respuesta docente a una observación y recarga el expediente", async () => {
    const draft = syllabus("correccion_solicitada");
    draft.observations = [{
      id: "observation-1",
      content: "Aclare el resultado.",
      state: "pendiente",
      requested: true,
      response: null,
    }];
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(respondObservation).mockResolvedValue(undefined);
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('textarea[placeholder="Ej. Corrección realizada"]').setValue("Contenido corregido.");
    const answerButton = wrapper.findAll("button").find((button) => button.text() === "Guardar respuesta");
    await answerButton?.trigger("click");
    await flushPromises();

    expect(respondObservation).toHaveBeenCalledWith(
      "syllabus-1",
      "observation-1",
      "Contenido corregido.",
    );
    expect(getTeacherSyllabus).toHaveBeenCalledTimes(2);
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

  it("vacía el autoguardado pendiente antes de validar", async () => {
    const draft = syllabus("borrador");
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, guardado_en: null });
    vi.mocked(validateTeacherSyllabus).mockResolvedValue({
      message: "Válido",
      validation: { blocking_errors: 0, warnings: 0, results: [] },
    });
    vi.mocked(requestAiReview).mockResolvedValue({
      message: "Revisión iniciada",
      review: {
        id: "review-1",
        status: "pendiente",
        draft_version: 3,
        total_fields: 1,
        completed_fields: 0,
        progress: 0,
      },
    });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get("textarea").setValue("Cambio antes de validar");
    const validateButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Validar sílabo");
    await validateButton?.trigger("click");
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledOnce();
    expect(validateTeacherSyllabus).toHaveBeenCalledOnce();
    expect(
      vi.mocked(saveTeacherField).mock.invocationCallOrder[0]!,
    ).toBeLessThan(vi.mocked(validateTeacherSyllabus).mock.invocationCallOrder[0]!);
  });
});
