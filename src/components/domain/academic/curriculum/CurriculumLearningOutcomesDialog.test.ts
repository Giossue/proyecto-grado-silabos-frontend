import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import type { SubjectLearningOutcomes } from "@/api/career-academics";
import CurriculumLearningOutcomesDialog from "./CurriculumLearningOutcomesDialog.vue";

const api = vi.hoisted(() => ({
  getSubjectLearningOutcomes: vi.fn(),
  saveSubjectLearningOutcomes: vi.fn(),
}));
vi.mock("@/api/career-academics", () => ({
  ...api,
  PURGE_CANCELLED_MESSAGE: "Cambio cancelado. No se guardó nada.",
}));

const existing: SubjectLearningOutcomes = {
  subject_id: "subject-1",
  source_name: "Proyecto de carrera",
  source_locator: "Página 22, fila 40",
  outcomes: [
    { id: "outcome-1", text: "Identifica los fundamentos de calidad.", position: 1 },
    { id: "outcome-2", text: "Aplica métricas de calidad.", position: 2 },
  ],
  confirmed_at: "2026-09-27T10:00:00Z",
  confirmed_by: { id: "coordinator", name: "Coordinación Software" },
  fingerprint: "a".repeat(64),
  editable: true,
  lock_reason: null,
};

const wrappers: ReturnType<typeof mount>[] = [];
const mountDialog = () => {
  const wrapper = mount(CurriculumLearningOutcomesDialog, {
    attachTo: document.body,
    props: { open: true, subject: { id: "subject-1", code: "SW-801", name: "Calidad de Software" } },
  });
  wrappers.push(wrapper);
  return wrapper;
};
const button = (label: string): HTMLButtonElement => {
  const result = Array.from(document.body.querySelectorAll<HTMLButtonElement>("button"))
    .find((candidate) => candidate.textContent?.trim() === label || candidate.getAttribute("aria-label") === label);
  if (!result) throw new Error(`No se encontró el botón ${label}`);
  return result;
};
const setValue = async (selector: string, value: string): Promise<void> => {
  const input = document.body.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
};
const confirm = async (): Promise<void> => {
  document.body.querySelector<HTMLButtonElement>("#learning-outcomes-confirmed")!.click();
  await flushPromises();
};
const submit = async (): Promise<void> => {
  document.body.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await flushPromises();
};

beforeEach(() => {
  vi.resetAllMocks();
  api.getSubjectLearningOutcomes.mockResolvedValue(structuredClone(existing));
  api.saveSubjectLearningOutcomes.mockResolvedValue({ ...existing, message: "Resultados guardados." });
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
});

describe("CurriculumLearningOutcomesDialog", () => {
  it("carga la materia elegida y exige revisar nuevamente después de cambiar el orden", async () => {
    const wrapper = mountDialog();
    await flushPromises();

    expect(api.getSubjectLearningOutcomes).toHaveBeenCalledWith("subject-1");
    expect(document.body.textContent).toContain("SW-801 · Calidad de Software");
    expect(button("Guardar y validar").disabled).toBe(true);
    await submit();
    expect(api.saveSubjectLearningOutcomes).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Revise el contenido y confirme");

    await confirm();
    expect(button("Guardar y validar").disabled).toBe(false);
    button("Subir resultado 2").click();
    await flushPromises();
    expect(button("Guardar y validar").disabled).toBe(true);
    expect(Array.from(document.body.querySelectorAll("textarea")).map((input) => input.value))
      .toEqual([existing.outcomes[1]!.text, existing.outcomes[0]!.text]);
    await confirm();
    await submit();
    expect(api.saveSubjectLearningOutcomes).toHaveBeenCalledWith("subject-1", {
      source_name: existing.source_name,
      source_locator: existing.source_locator,
      outcomes: [
        { id: "outcome-2", text: existing.outcomes[1]!.text },
        { id: "outcome-1", text: existing.outcomes[0]!.text },
      ],
      confirmed: true,
      expected_fingerprint: existing.fingerprint,
    });
    expect(wrapper.emitted("saved")).toEqual([["Resultados guardados."]]);
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
  });

  it("registra una lista nueva con procedencia y vuelve a pedir confirmación al editarla", async () => {
    api.getSubjectLearningOutcomes.mockResolvedValue({ ...existing, source_name: "", source_locator: "", outcomes: [], fingerprint: null, confirmed_at: null, confirmed_by: null });
    mountDialog();
    await flushPromises();
    expect(document.body.textContent).toContain("Sin resultados registrados");
    button("Agregar resultado").click();
    await flushPromises();
    await setValue("#learning-outcomes-source", " Proyecto de carrera ");
    await setValue("#learning-outcomes-locator", " Página 22 ");
    await setValue("textarea", " Evalúa la calidad del software. ");
    await confirm();
    await setValue("#learning-outcomes-locator", " Página 22, fila 40 ");
    expect(button("Guardar y validar").disabled).toBe(true);
    await confirm();
    await setValue("textarea", " Aplica estándares de calidad. ");
    expect(button("Guardar y validar").disabled).toBe(true);
    await confirm();
    await submit();

    expect(api.saveSubjectLearningOutcomes).toHaveBeenCalledWith("subject-1", {
      source_name: "Proyecto de carrera",
      source_locator: "Página 22, fila 40",
      outcomes: [{ text: "Aplica estándares de calidad." }],
      confirmed: true,
      expected_fingerprint: null,
    });
  });

  it("conserva texto y errores del servidor y evita sobrescribir un cambio concurrente", async () => {
    api.saveSubjectLearningOutcomes.mockRejectedValueOnce(new ApiError("Revise el contenido.", 422, {
      "outcomes.0.text": ["Este resultado ya está repetido."],
    })).mockRejectedValueOnce(new ApiError("Los resultados de aprendizaje cambiaron. Vuelva a abrirlos antes de guardar.", 409));
    const wrapper = mountDialog();
    await flushPromises();
    await confirm();
    await submit();
    expect(document.body.textContent).toContain("Este resultado ya está repetido.");
    expect(document.body.querySelector("textarea")?.getAttribute("aria-invalid")).toBe("true");
    expect(wrapper.emitted("saved")).toBeUndefined();
    await submit();
    expect(document.body.textContent).toContain("Vuelva a abrirlos antes de guardar.");
    expect(document.body.querySelector("textarea")?.value).toBe(existing.outcomes[0]!.text);
    expect(button("Guardar y validar").disabled).toBe(true);
    await submit();
    expect(api.saveSubjectLearningOutcomes).toHaveBeenCalledTimes(2);
  });

  it("permite consultar los resultados bloqueados sin controles de mutación", async () => {
    api.getSubjectLearningOutcomes.mockResolvedValue({ ...existing, editable: false, lock_reason: "La convocatoria está abierta." });
    mountDialog();
    await flushPromises();
    expect(document.body.textContent).toContain("La convocatoria está abierta.");
    expect(document.body.textContent).not.toContain("Guardar y validar");
    expect(document.body.textContent).not.toContain("Agregar resultado");
    expect(document.body.querySelector("textarea")?.readOnly).toBe(true);
    expect(document.body.querySelector("#learning-outcomes-confirmed")).toBeNull();
    await submit();
    expect(api.saveSubjectLearningOutcomes).not.toHaveBeenCalled();
  });

  it("distingue un fallo de carga de una materia sin resultados y permite reintentar", async () => {
    api.getSubjectLearningOutcomes.mockRejectedValueOnce(new ApiError("No tiene permiso para consultar esta materia.", 403));
    mountDialog();
    await flushPromises();
    expect(document.body.textContent).toContain("No tiene permiso");
    expect(document.body.textContent).not.toContain("Sin resultados registrados");
    button("Reintentar carga").click();
    await flushPromises();
    expect(document.body.querySelector("textarea")?.value).toBe(existing.outcomes[0]!.text);
  });
});
