import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import {
  approveReview,
  getReview,
  reopenSyllabus,
  requestCorrection,
  resetSyllabus,
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
  approveReview: vi.fn(),
  getReview: vi.fn(),
  reopenSyllabus: vi.fn(),
  requestCorrection: vi.fn(),
  resetSyllabus: vi.fn(),
}));

const detail = (decisionsAllowed = true): ReviewDetail => ({
  syllabus: {
    id: "syllabus-1",
    subject: "Arquitectura de Software",
    code: "SW-601",
    period: "2026-2027",
    state: "en_revision",
    stage: "coordinacion",
    teachers: ["Docente Demo"],
  },
  my_stage: "coordinacion",
  can_decide: decisionsAllowed,
  can_reopen: false,
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
    snapshot: {
      sections: [{
        key: "descripcion",
        title: "Descripción",
        blocks: [{
          key: "descripcion",
          title: "Descripción",
          content_type: "text",
          fields: [{
            key: "objetivo",
            label: "Objetivo general",
            type: "texto_largo",
            inherited: false,
            value: "Contenido enviado",
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
  correction_request: null,
  decisions_allowed: decisionsAllowed,
  reset: { allowed: false },
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
      approveReview,
      getReview,
      reopenSyllabus,
      requestCorrection,
      resetSyllabus,
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

  it("deja la revisión solo para consulta con la convocatoria cerrada", async () => {
    vi.mocked(getReview).mockResolvedValue(detail(false));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Convocatoria cerrada");
    expect(wrapper.find("#correction-form").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Aprobar revisión");
    wrapper.unmount();
  });

  it("aprueba la revisión", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(approveReview).mockResolvedValue({ message: "Revisión aprobada." });
    const wrapper = mountPage();
    await flushPromises();

    const approve = wrapper.findAll("button").find((button) => button.text().includes("Aprobar revisión"))!;
    expect(approve.attributes("disabled")).toBeUndefined();
    await approve.trigger("click");
    await flushPromises();

    expect(approveReview).toHaveBeenCalledWith("revision-1");
    wrapper.unmount();
  });

  it("solicita corrección con un comentario general, sin observaciones por campo", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(requestCorrection).mockResolvedValue({ message: "Corrección solicitada." });
    const wrapper = mountPage();
    await flushPromises();

    const correctionForm = wrapper.get("#correction-form");
    expect(correctionForm.find('[role="checkbox"]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Nueva observación"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("Observaciones");
    await correctionForm.get("textarea").setValue("Debe precisar el resultado observado.");
    await correctionForm.trigger("submit");
    await flushPromises();

    expect(requestCorrection).toHaveBeenCalledWith("revision-1", {
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
