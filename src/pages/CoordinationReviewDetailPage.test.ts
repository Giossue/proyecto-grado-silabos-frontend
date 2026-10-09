import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
import { ApiError } from "@/api/client";
import {
  approveReview,
  deleteSyllabus,
  getReview,
  requestCorrection,
  resetSyllabus,
  type ReviewDetail,
} from "@/api/reviews";
import { getSession } from "@/api/session";
import CoordinationReviewDetailPage from "@/pages/CoordinationReviewDetailPage.vue";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-router")>()),
  useRoute: () => ({ params: { revision: "revision-1" }, fullPath: "/coordinacion/revisiones/revision-1" }),
  useRouter: () => ({ replace }),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));
vi.mock("@/api/reviews", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/reviews")>()),
  approveReview: vi.fn(),
  deleteSyllabus: vi.fn(),
  getReview: vi.fn(),
  requestCorrection: vi.fn(),
  resetSyllabus: vi.fn(),
}));

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

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
  can_delete: false,
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
        fields: [
          { key: "objetivo", label: "Objetivo general", quien_llena: "docente", value: doc("Contenido enviado") },
          { key: "perfil", label: "Descripción", quien_llena: "coordinacion", value: doc("Contenido heredado") },
          { key: 'unidades', label: 'Planificación', quien_llena: 'docente', value: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Semana 1: Introducción' }] }] }] }] }] } },
          { key: 'identificacion', label: '', quien_llena: 'institucional', value: doc('FACULTAD: Ciencias') },
          { key: "conducta", label: "Conducta ética", quien_llena: "institucional", value: doc("Texto institucional") },
        ],
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
      deleteSyllabus,
      getReview,
      requestCorrection,
      resetSyllabus,
    ]) vi.mocked(mock).mockReset();
    replace.mockReset();
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

  it("elimina un sílabo aprobado con confirmación y vuelve a la cola", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(), can_delete: true });
    vi.mocked(deleteSyllabus).mockResolvedValue({ message: "Sílabo eliminado." });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Eliminar sílabo aprobado");
    expect(wrapper.text()).not.toContain("Reabrir");
    await wrapper.findAll("button").find((button) => button.text() === "Eliminar sílabo")!.trigger("click");
    await flushPromises();
    expect(deleteSyllabus).not.toHaveBeenCalled();
    const confirm = [...document.body.querySelectorAll('[role="dialog"] button')]
      .find((item) => item.textContent?.includes("Eliminar definitivamente")) as HTMLButtonElement;
    confirm.click();
    await flushPromises();

    expect(deleteSyllabus).toHaveBeenCalledWith("syllabus-1");
    expect(replace).toHaveBeenCalled();
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

  it("pinta los documentos congelados y su responsable", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    const wrapper = mountPage();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain("Contenido enviado");
    expect(text).toContain("Contenido heredado");
    expect(text).toContain("Coordinación");
    expect(wrapper.get(".free-text-table").text()).toContain("Semana 1");
    expect(text).toContain("FACULTAD: Ciencias");
    expect(text).toContain("Texto institucional");
    wrapper.unmount();
  });
});
