import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeacherSyllabusDetailPage from "@/pages/TeacherSyllabusDetailPage.vue";
import {
  getTeacherSyllabus,
  requestAiReview,
  saveTeacherField,
  validateTeacherSyllabus,
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

const syllabus = (state: "borrador" | "en_revision", type = "markdown") => ({
  id: "syllabus-1",
  subject: "Inteligencia Artificial",
  code: "SW-01",
  convocation: "2026",
  period: "2026",
  state,
  version_bloqueo: 2,
  completion: 50,
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
      SyllabusAiChat: { template: "<div />" },
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
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, completion: 100 });
    const wrapper = mountPage();
    await flushPromises();

    const options = wrapper.findAll('.boolean-options input[type="radio"]');
    expect(options).toHaveLength(2);
    expect(
      options.every((option) => !(option.element as HTMLInputElement).checked),
    ).toBe(true);
    await options[1]!.setValue(true);
    await vi.advanceTimersByTimeAsync(700);
    await flushPromises();

    expect(saveTeacherField).toHaveBeenCalledWith(
      "syllabus-1",
      "field-1",
      2,
      false,
    );
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
    draft.completion = 100;
    vi.mocked(getTeacherSyllabus).mockResolvedValue({ syllabus: draft });
    vi.mocked(saveTeacherField).mockResolvedValue({ version_bloqueo: 3, completion: 100 });
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
