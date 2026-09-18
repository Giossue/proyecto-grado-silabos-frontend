import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import {
  addObservation,
  approveReview,
  getReview,
  reopenSyllabus,
  requestCorrection,
  resetSyllabus,
  transferTeacher,
  verifyObservation,
  type ReviewDetail,
} from "@/api/reviews";
import { getSession } from "@/api/session";
import CoordinationReviewDetailPage from "@/pages/CoordinationReviewDetailPage.vue";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRoute: () => ({ params: { revision: "revision-1" }, fullPath: "/coordinacion/revisiones/revision-1" }),
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));
vi.mock("@/api/reviews", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/reviews")>()),
  addObservation: vi.fn(),
  approveReview: vi.fn(),
  getReview: vi.fn(),
  reopenSyllabus: vi.fn(),
  requestCorrection: vi.fn(),
  resetSyllabus: vi.fn(),
  transferTeacher: vi.fn(),
  verifyObservation: vi.fn(),
}));

const detail = (withObservation = false): ReviewDetail => ({
  syllabus: {
    id: "syllabus-1",
    subject: "Arquitectura de Software",
    code: "SW-601",
    period: "2026-2027",
    state: "en_revision",
    teachers: ["Docente Demo"],
  },
  presentation: {
    appearance: {
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
    },
    title: "PROGRAMA DE ASIGNATURA (SÍLABO)",
    logos: { institution: "/institution.png", faculty: "/faculty.png" },
  },
  revision: {
    id: "revision-1",
    number: 1,
    submitted_at: "2026-09-16T10:00:00Z",
    submitted_by: "Docente Demo",
    is_current: true,
    identification: null,
    snapshot: {
      sections: [{
        key: "descripcion",
        title: "Descripción",
        blocks: [{
          key: "descripcion",
          title: "Descripción",
          content_type: "text",
          table: null,
          fields: [{
            key: "objetivo",
            label: "Objetivo general",
            type: "markdown",
            inherited: false,
            value: "Contenido enviado",
            rows: [],
          }],
        }],
      }],
    },
  },
  history: [{
    id: "revision-1",
    number: 1,
    submitted_at: "2026-09-16T10:00:00Z",
    submitted_by: "Docente Demo",
    approved_at: null,
  }],
  observations: withObservation ? [{
    id: "observation-1",
    revision_number: 1,
    section_key: "descripcion",
    field_key: "objetivo",
    content: "Aclare el resultado esperado.",
    state: "abierta",
    requested: false,
    can_verify: false,
    created_by: "Coordinación Demo",
    observado_en: "2026-09-16T10:05:00Z",
    response: null,
  }] : [],
  correction_request: null,
  reset: { allowed: false },
  transfer: { allowed: false, current: [], candidates: [] },
  reopening: null,
});

const mountPage = () => mount(CoordinationReviewDetailPage, {
  attachTo: document.body,
  global: {
    stubs: {
      RouterLink: { template: "<a><slot /></a>" },
      SyllabusDocumentHeader: { template: "<div />" },
      SyllabusIdentificationTable: { template: "<div />" },
      SyllabusTableView: { template: "<div />" },
      SnapshotValue: { template: "<div />" },
    },
  },
});

describe("CoordinationReviewDetailPage", () => {
  beforeEach(() => {
    for (const mock of [
      addObservation,
      approveReview,
      getReview,
      reopenSyllabus,
      requestCorrection,
      resetSyllabus,
      transferTeacher,
      verifyObservation,
    ]) vi.mocked(mock).mockReset();
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: "coordinator-1",
        name: "Coordinación Demo",
        email: "coordinator@example.test",
        email_verified: true,
        can_edit_identity: false,
      },
      active_role: {
        id: "role-1",
        code: "coordinador",
        career_id: "career-1",
        career_name: "Software",
      },
      available_roles: [],
    });
  });

  it("registra una observación sobre el documento", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(addObservation).mockResolvedValue({ message: "Observación registrada." });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('[aria-label="Nueva observación"]').trigger("click");
    await flushPromises();
    const textarea = document.querySelector<HTMLTextAreaElement>("#observation-content")!;
    textarea.value = "Aclare el resultado esperado.";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    textarea.closest("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(addObservation).toHaveBeenCalledWith("revision-1", {
      content: "Aclare el resultado esperado.",
    });
    wrapper.unmount();
  });

  it("envía únicamente las observaciones elegidas al solicitar corrección", async () => {
    vi.mocked(getReview).mockResolvedValue(detail(true));
    vi.mocked(requestCorrection).mockResolvedValue({ message: "Corrección solicitada." });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.get('.ai-recommendation [role="checkbox"]').trigger("click");
    const correctionForm = wrapper.get("#correction-form");
    await correctionForm.get("textarea").setValue("Debe precisar el resultado observado.");
    await correctionForm.trigger("submit");
    await flushPromises();

    expect(requestCorrection).toHaveBeenCalledWith("revision-1", {
      observation_ids: ["observation-1"],
      justification: "Debe precisar el resultado observado.",
    });
    wrapper.unmount();
  });

  it("distingue un fallo inicial de carga y permite reintentar", async () => {
    vi.mocked(getReview).mockRejectedValueOnce(new ApiError("Revisión no disponible.", 503));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Revisión no disponible.");
    expect(wrapper.text()).toContain("Reintentar");

    vi.mocked(getReview).mockResolvedValueOnce(detail());
    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect(getReview).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Contenido enviado");
    wrapper.unmount();
  });
});
