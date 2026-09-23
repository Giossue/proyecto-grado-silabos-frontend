import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import {
  getTeacherSyllabus,
  saveTeacherField,
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
  submitTeacherSyllabus: vi.fn(),
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

  it("oculta la revisión final y el botón de validación", async () => {
    const draft = syllabus("borrador");
    draft.sections.push({
      id: "section-review",
      key: "revision",
      title: "Revisión y aprobación",
      description: "Complete los campos aplicables.",
      blocks: [{
        id: "review-block",
        title: "Estado de revisión",
        content_type: "flow",
        table: null,
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
        message: "Completa el campo obligatorio «Descripción de la asignatura».",
      }],
    };
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Descripción");
    expect(wrapper.text()).not.toContain("Revisión y aprobación");
    expect(wrapper.text()).not.toContain("Resultados de validación");
    expect(wrapper.text()).not.toContain("Completa el campo obligatorio");
    expect(wrapper.findAll("button").some((button) => button.text() === "Validar sílabo")).toBe(false);
  });
});
