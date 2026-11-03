import RoleDeadlineBanner from '@/components/domain/RoleDeadlineBanner.vue';
import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
import { ApiError } from "@/api/client";
import {
  approveReview,
  compareReviews,
  getReview,
  requestCorrection,
  resetSyllabus,
  type ReviewDetail,
} from "@/api/reviews";
import { getSession } from "@/api/session";
import { makeTestP12 } from "@/lib/signature/testCertificate";
import CoordinationReviewDetailPage from "@/pages/CoordinationReviewDetailPage.vue";
import { DIALOG_EXIT_MS } from "@/lib/dialogExit";
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
  compareReviews: vi.fn(),
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
  timeline: [{ kind: "enviado", at: "2026-09-16T10:00:00Z", revision_id: "revision-1", revision_number: 1, by: "Docente Demo", comment: null, previous_id: null }],
  correction_request: null,
  decisions_allowed: decisionsAllowed,
  convocation_closed: !decisionsAllowed,
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

// jsdom no anima: con un nombre de animación al cerrar, reka deja el contenido montado como en el navegador.
const simulateExitAnimation = (): void => {
  const style = document.createElement("style");
  style.dataset.exit = "";
  style.textContent = '[data-state="closed"] { animation-name: exit; }';
  document.head.append(style);
};
const exit = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, DIALOG_EXIT_MS));
  await flushPromises();
};

describe("CoordinationReviewDetailPage", () => {
  beforeEach(() => {
    document.head.querySelectorAll("style[data-exit]").forEach((style) => style.remove());
    for (const mock of [
      approveReview,
      compareReviews,
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

  it("en pausa no repite el motivo junto al estado: lo explica la franja", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(false), convocation_closed: false, decision_block: "La convocatoria de la carrera está en pausa: las revisiones se retoman cuando se reanude." });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.findComponent(RoleDeadlineBanner).exists()).toBe(true);
    expect(wrapper.text()).not.toContain("está en pausa");
    expect(wrapper.text()).not.toContain("Convocatoria cerrada");
    expect(headerButton(wrapper, "Firmar y enviar a biblioteca")).toBeUndefined();
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

  it("de una devolución de biblioteca solo dice quién devolvió, sin su comentario", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(), correction_request: { justification: null, requested_at: "2026-10-30T10:00:00Z", stage: "biblioteca", requested_by: null } });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Corrección solicitada por biblioteca");
    expect(wrapper.find(".review-comment").exists()).toBe(false);
    wrapper.unmount();
  });

  it("de una corrección de coordinación muestra el comentario en una tarjeta", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(), correction_request: { justification: "Revise la unidad 2", requested_at: "2026-10-30T10:00:00Z", stage: "coordinacion", requested_by: "Coordinadora Demo" } });
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.get(".review-comment").text()).toContain("Revise la unidad 2");
    wrapper.unmount();
  });

  it("firma la declaración y envía a biblioteca", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(approveReview).mockResolvedValue({ message: "Enviado a biblioteca" });
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
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/coordinacion/revisiones"));
    expect(getReview).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });

  it("muestra en el diálogo el error de firma del servidor", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(approveReview).mockRejectedValue(new ApiError("Datos inválidos", 422, { signature: ["El certificado no es de una entidad de confianza"] }));
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Firmar y enviar a biblioteca")!.trigger("click");
    await flushPromises();
    await fillSignatureDialog(makeTestP12("COORDINACION DEMO", "clave"), "clave");
    await confirmSignatureDialog();

    expect(document.querySelector('[role="dialog"]')!.textContent).toContain("El certificado no es de una entidad de confianza");
    wrapper.unmount();
  });

  it("solicita corrección con un comentario general", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(requestCorrection).mockResolvedValue({ message: "Corrección solicitada" });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Solicitar corrección")!.trigger("click");
    await flushPromises();
    const textarea = document.querySelector<HTMLTextAreaElement>("#correction-justification")!;
    textarea.value = "Debe precisar el resultado observado";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    document.querySelector<HTMLFormElement>("#correction-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();

    expect(requestCorrection).toHaveBeenCalledWith("revision-1", {
      justification: "Debe precisar el resultado observado",
    });
    // Vuelve a la cola cuando el diálogo terminó de cerrarse.
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/coordinacion/revisiones"));
    wrapper.unmount();
  });

  it("reinicia un sílabo aprobado desde «Más»: motivo y nombre de la materia, sin cuenta regresiva, y vuelve a la cola", async () => {
    vi.mocked(getReview).mockResolvedValue({ ...detail(), reset: { allowed: true, erases_history: true, revisions: 2, signatures: 3, has_pdf: true } });
    vi.mocked(resetSyllabus).mockResolvedValue({ message: "Sílabo reiniciado" });
    const wrapper = mountPage();
    await flushPromises();

    await headerButton(wrapper, "Más")!.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(document.body.querySelectorAll('[role="menuitem"]')).toHaveLength(1);
    expect([...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].some((item) => item.textContent?.includes("Eliminar"))).toBe(false);
    [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.includes("Reiniciar sílabo"))!.click();
    await flushPromises();

    expect(document.body.textContent).toContain("3 firma(s)");
    expect(document.body.textContent).toContain("2 revisión(es), la aprobación y el PDF");
    const confirm = () => dialogButton("Reiniciar")!;
    const type = (selector: string, value: string) => {
      const input = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event("input"));
    };
    expect(confirm().textContent?.trim()).toBe("Reiniciar");
    expect(confirm().disabled).toBe(true);
    type("#restart-reason", "Error en la ficha de la materia");
    type("#restart-name", "Álgebra");
    await flushPromises();
    expect(confirm().disabled).toBe(true);

    type("#restart-name", "Arquitectura de Software");
    await flushPromises();
    expect(confirm().disabled).toBe(false);
    confirm().click();
    await flushPromises();

    expect(resetSyllabus).toHaveBeenCalledWith("syllabus-1", "Error en la ficha de la materia");
    await vi.waitFor(() => expect(replace).toHaveBeenCalled());
    wrapper.unmount();
  });

  it("el historial lleva a su propia pantalla de versiones", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[aria-label="Historial"]').exists()).toBe(true);
    wrapper.unmount();
  });

  it("desde la segunda versión «Comparar» muestra la anterior al lado y marca los campos que cambiaron solo en la actual", async () => {
    const second = detail();
    second.revision = { ...second.revision, id: "revision-2", number: 2 };
    second.history = [...second.history, { id: "revision-2", number: 2, submitted_at: "2026-09-20T10:00:00Z", submitted_by: "Docente Demo", approved_at: null }];
    vi.mocked(getReview).mockResolvedValue(second);
    vi.mocked(compareReviews).mockResolvedValue({
      syllabus: { id: "syllabus-1", subject: "Arquitectura de Software", code: "SW-601", period: "2026-2027" },
      comparison: { before_revision: 1, after_revision: 2, changed_fields: 1, changes: [{ section_key: "descripcion", section_title: "Descripción", field_key: "objetivo", label: "Objetivo general", quien_llena: "docente", change: "modified", before: null, after: null }] },
    } as never);
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[data-change-mark]').exists()).toBe(false);
    expect(wrapper.find('[aria-label="Versión anterior"]').exists()).toBe(false);
    await headerButton(wrapper, "Comparar con la versión anterior")!.trigger("click");
    await flushPromises();

    expect(compareReviews).toHaveBeenCalledWith("revision-1", "revision-2");
    expect(getReview).toHaveBeenCalledWith("revision-1");
    expect(wrapper.find('[aria-label="Versión anterior"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="Versión actual"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-changed]')).toHaveLength(1);
    await headerButton(wrapper, "Resaltar cambios")!.trigger("click");
    expect(wrapper.findAll('[data-changed]')).toHaveLength(0);
    await headerButton(wrapper, "Resaltar cambios")!.trigger("click");
    expect(wrapper.findAll('[data-changed]')).toHaveLength(1);

    await headerButton(wrapper, "Comparar con la versión anterior")!.trigger("click");
    expect(wrapper.find('[aria-label="Versión anterior"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it("con el sílabo devuelto al docente no ofrece comparar, porque no hay una versión nueva que revisar", async () => {
    const returned = detail();
    returned.syllabus = { ...returned.syllabus, state: "correccion_solicitada", stage: null as never };
    returned.revision = { ...returned.revision, id: "revision-2", number: 2 };
    returned.history = [...returned.history, { id: "revision-2", number: 2, submitted_at: "2026-09-20T10:00:00Z", submitted_by: "Docente Demo", approved_at: null }];
    vi.mocked(getReview).mockResolvedValue(returned);
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('[aria-label="Historial"]').exists()).toBe(true);
    expect(headerButton(wrapper, "Comparar con la versión anterior")).toBeUndefined();
    wrapper.unmount();
  });

  it("con un solo envío no ofrece comparar", async () => {
    vi.mocked(getReview).mockResolvedValue(detail());
    const wrapper = mountPage();
    await flushPromises();

    expect(headerButton(wrapper, "Comparar con la versión anterior")).toBeUndefined();
    wrapper.unmount();
  });

  it("distingue un fallo inicial de carga y permite reintentar", async () => {
    vi.mocked(getReview).mockRejectedValueOnce(new ApiError("Revisión no disponible", 503));
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain("Revisión no disponible");
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

  it("al solicitar corrección, el diálogo se desvanece con el comentario escrito y luego vuelve a la cola", async () => {
    simulateExitAnimation();
    vi.mocked(getReview).mockResolvedValue(detail());
    vi.mocked(requestCorrection).mockResolvedValue({ message: "Corrección solicitada" });
    const wrapper = mountPage();
    await flushPromises();
    await headerButton(wrapper, "Solicitar corrección")!.trigger("click");
    await flushPromises();
    const textarea = (): HTMLTextAreaElement => document.querySelector<HTMLTextAreaElement>("#correction-justification")!;
    textarea().value = "Debe precisar el resultado observado";
    textarea().dispatchEvent(new Event("input"));
    await flushPromises();

    document.querySelector<HTMLFormElement>("#correction-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
    await flushPromises();

    expect(requestCorrection).toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('[role="dialog"]')!.dataset.state).toBe("closed");
    expect(textarea().value).toBe("Debe precisar el resultado observado");
    expect(replace).not.toHaveBeenCalled();
    await exit();
    expect(replace).toHaveBeenCalledWith("/coordinacion/revisiones");
    wrapper.unmount();
  });

  it("al reiniciar sin borrar el historial, refresca la revisión cuando el diálogo terminó de cerrarse", async () => {
    simulateExitAnimation();
    vi.mocked(getReview)
      .mockResolvedValueOnce({ ...detail(), reset: { allowed: true, erases_history: false, revisions: 1, signatures: 0, has_pdf: false } })
      .mockResolvedValue({ ...detail(), reset: { allowed: false } });
    vi.mocked(resetSyllabus).mockResolvedValue({ message: "Sílabo reiniciado" });
    const wrapper = mountPage();
    await flushPromises();
    await headerButton(wrapper, "Más")!.trigger("keydown", { key: "Enter" });
    await flushPromises();
    [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.includes("Reiniciar sílabo"))!.click();
    await flushPromises();
    const reason = document.body.querySelector<HTMLTextAreaElement>("#restart-reason")!;
    reason.value = "Error en la ficha de la materia";
    reason.dispatchEvent(new Event("input"));
    await flushPromises();

    dialogButton("Reiniciar")!.click();
    await flushPromises();

    expect(resetSyllabus).toHaveBeenCalled();
    expect(getReview).toHaveBeenCalledTimes(1);
    const restart = (): HTMLElement | undefined => [...document.body.querySelectorAll<HTMLElement>('[role="dialog"]')].find((item) => item.textContent?.includes("Reiniciar «Arquitectura de Software»"));
    expect(restart()?.dataset.state).toBe("closed");
    await exit();
    expect(getReview).toHaveBeenCalledTimes(2);
    expect(restart()).toBeUndefined();
    wrapper.unmount();
  });
});
