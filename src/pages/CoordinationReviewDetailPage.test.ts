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
import { makeTestP12 } from "@/lib/signature/testCertificate";
import CoordinationReviewDetailPage from "@/pages/CoordinationReviewDetailPage.vue";
import { confirmSignatureDialog, fillSignatureDialog } from "@/test/signatureDialog";

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
  signing_statement: decisionsAllowed ? "silabos-ueb|silabo:syllabus-1|accion:aprobacion_coordinacion|huella:abc" : null,
  signatures: [{ role: "docente", name: "Docente Demo", signed_at: "2026-09-16T10:00:00Z" }],
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
  global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
});

const headerButton = (wrapper: ReturnType<typeof mountPage>, name: string) =>
  wrapper.findAll("header button").find((button) => button.text() === name || button.attributes("aria-label") === name);
const dialogButton = (name: string) => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
  .find((item) => item.textContent?.includes(name));

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
    document.body.innerHTML = "";
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
    expect(headerButton(wrapper, "Solicitar corrección")).toBeUndefined();
    expect(headerButton(wrapper, "Firmar y enviar a biblioteca")).toBeUndefined();
    wrapper.unmount();
  });

  it("firma la declaración y envía a biblioteca", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(approveReview).mockResolvedValue({ message: "Enviado a biblioteca." });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).not.toContain("Firmado por Docente Demo (docente)");
    expect(wrapper.text()).not.toContain("SW-601");
    await headerButton(wrapper, "Firmar y enviar a biblioteca")!.trigger("click");
    await flushPromises();
    await fillSignatureDialog(makeTestP12("COORDINACION DEMO", "clave"), "clave");
    await confirmSignatureDialog();

    expect(approveReview).toHaveBeenCalledWith("revision-1", {
      statement: "silabos-ueb|silabo:syllabus-1|accion:aprobacion_coordinacion|huella:abc",
      cms: expect.stringMatching(/^[A-Za-z0-9+/]+=*$/),
    });
    expect(getReview).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it("muestra en el diálogo el error de firma del servidor", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(approveReview).mockRejectedValue(new ApiError("Datos inválidos.", 422, { signature: ["El certificado no es de una entidad de confianza."] }));
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Firmar y enviar a biblioteca")!.trigger("click");
    await flushPromises();
    await fillSignatureDialog(makeTestP12("COORDINACION DEMO", "clave"), "clave");
    await confirmSignatureDialog();

    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("El certificado no es de una entidad de confianza.");
    wrapper.unmount();
  });

  it("solicita corrección con un comentario general", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(requestCorrection).mockResolvedValue({ message: "Corrección solicitada." });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Solicitar corrección")!.trigger("click");
    await flushPromises();
    const textarea = document.querySelector<HTMLTextAreaElement>("#correction-justification")!;
    textarea.value = "Debe precisar el resultado observado.";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    document.querySelector<HTMLFormElement>("#correction-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();

    expect(requestCorrection).toHaveBeenCalledWith("revision-1", {
      justification: "Debe precisar el resultado observado.",
    });
    wrapper.unmount();
  });

  it("elimina un sílabo aprobado desde «Más» con confirmación y vuelve a la cola", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(), can_delete: true });
    vi.mocked(deleteSyllabus).mockResolvedValue({ message: "Sílabo eliminado." });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Más")!.trigger("keydown", { key: "Enter" });
    await flushPromises();
    [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.includes("Eliminar sílabo"))!.click();
    await flushPromises();
    expect(deleteSyllabus).not.toHaveBeenCalled();
    dialogButton("Eliminar definitivamente")!.click();
    await flushPromises();

    expect(deleteSyllabus).toHaveBeenCalledWith("syllabus-1");
    expect(replace).toHaveBeenCalled();
    wrapper.unmount();
  });

  it("muestra el historial en una hoja", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Historial")!.trigger("click");
    await flushPromises();

    expect(document.body.textContent).toContain("Revisión 1 (abierta)");
    wrapper.unmount();
  });

  it("distingue un fallo inicial de carga y permite reintentar", async () => {
    vi.mocked(getReview).mockRejectedValueOnce(new ApiError("Revisión no disponible.", 503));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Revisión no disponible.");
    expect(wrapper.text()).toContain("Reintentar");

    vi.mocked(getReview).mockResolvedValueOnce(detail());
    await wrapper.findAll("button").find((button) => button.text().includes("Reintentar"))!.trigger("click");
    await flushPromises();

    expect(getReview).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain("Contenido enviado");
    wrapper.unmount();
  });

  it("muestra el sílabo como el documento final", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    const wrapper = mountPage();
    await flushPromises();

    const preview = wrapper.get('[aria-label="Vista previa del sílabo"]');
    expect(preview.text()).toContain("PROGRAMA DE ASIGNATURA (SÍLABO)");
    expect(preview.text()).toContain("Contenido enviado");
    expect(preview.text()).toContain("Contenido heredado");
    expect(preview.get(".free-text-table").text()).toContain("Semana 1");
    expect(preview.text()).toContain("FACULTAD: Ciencias");
    expect(preview.text()).toContain("Texto institucional");
    wrapper.unmount();
  });
});
