import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoordinationConvocationsPage from "@/pages/CoordinationConvocationsPage.vue";
import { createConvocation, getConvocation, getConvocations } from "@/api/convocations";
import { getSession } from "@/api/session";
import { Select } from "@/components/ui/select";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useRoute: () => ({ fullPath: "/coordinacion/convocatorias" }),
}));

vi.mock("@/api/convocations", () => ({
  getConvocation: vi.fn(),
  getConvocations: vi.fn(),
  createConvocation: vi.fn(),
  transitionConvocation: vi.fn(),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));

describe("CoordinationConvocationsPage", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    push.mockReset();
    vi.mocked(getSession).mockResolvedValue({
      user: {
        id: "user-1",
        name: "Coordinación",
        email: "coord@test.local",
        email_verified: true,
        can_edit_identity: false,
      },
      active_role: { id: "role-1", code: "coordinador", career_id: "career-1", career_name: "Software" },
      available_roles: [],
    });
    vi.mocked(getConvocation).mockReset();
    vi.mocked(getConvocations).mockResolvedValue({
      filters: { q: null, state: null },
      convocations: {
        data: [{
          id: null,
          process_id: "process-1",
          name: "2026-2",
          state: "sin_iniciar",
          process_state: "abierto",
          period: "2026-2",
          template: "Plantilla institucional",
          syllabi_count: 0,
        }],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        from: 1,
        to: 1,
        total: 1,
      },
    });
    vi.mocked(createConvocation).mockResolvedValue({
      message: "Convocatoria iniciada",
      convocation_id: "convocation-1",
    });
  });

  it("abre la convocatoria sin pedir selección de fuentes", async () => {
    const wrapper = mount(CoordinationConvocationsPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();

    await wrapper.get("table tbody button").trigger("click");
    await flushPromises();
    const startItem = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find((item) => item.textContent?.includes('Abrir convocatoria'));
    startItem?.click();
    await flushPromises();
    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Abrir convocatoria'));
    expect(document.body.querySelector('[role="dialog"] [role="checkbox"]')).toBeNull();
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();

    expect(createConvocation).toHaveBeenCalledWith("process-1");
    expect(getConvocations).toHaveBeenLastCalledWith({ q: "", state: "", page: 1 });
    expect(push).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it("abre el seguimiento en un modal al hacer clic en la fila", async () => {
    vi.mocked(getConvocations).mockResolvedValue({
      filters: { q: null, state: null },
      convocations: {
        data: [{
          id: "convocation-1",
          process_id: "process-1",
          name: "2026-2",
          state: "abierta",
          process_state: "abierto",
          period: "2026-2",
          template: "Plantilla institucional",
          syllabi_count: 1,
        }],
        current_page: 1,
        last_page: 1,
        per_page: 15,
        from: 1,
        to: 1,
        total: 1,
      },
    });
    vi.mocked(getConvocation).mockResolvedValue({
      convocation: {
        id: "convocation-1",
        name: "2026-2",
        state: "abierta",
        process: { name: "Proceso institucional", state: "abierto" },
        period: "2026-2",
        template: "Plantilla institucional",
        start_date: "2026-09-09T00:00:00Z",
        draft_deadline: "2026-09-15T00:00:00Z",
        counts: { total: 1, not_started: 0, draft: 1, in_review: 0, approved: 0 },
        syllabi: [{ id: "syllabus-1", subject: "Inteligencia Artificial", code: "SW-P7-037", state: "borrador", iniciado_en: "2026-09-10T00:00:00Z", parallels: ["A"], teachers: ["Patricio Carlos Landa Muñoz"] }],
      },
    });

    const wrapper = mount(CoordinationConvocationsPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();

    await wrapper.get("table tbody button").trigger("click");
    const menuItems = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    expect(menuItems.some((item) => item.textContent?.includes("Ver seguimiento"))).toBe(false);
    await wrapper.get("table tbody tr").trigger("click");
    await flushPromises();

    expect(getConvocation).toHaveBeenCalledWith("convocation-1");
    expect(document.body.textContent).toContain("Seguimiento por expediente");
    expect(document.body.textContent).not.toContain("Configuración fijada");
    expect(document.body.querySelectorAll('[role="dialog"] th')).toHaveLength(4);
    expect(Array.from(document.body.querySelectorAll('[role="dialog"] th')).some((cell) => cell.textContent?.includes("Estado"))).toBe(true);
    wrapper.unmount();
  });

  it("aplica el filtro de estado al cambiar el Select", async () => {
    const wrapper = mount(CoordinationConvocationsPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();

    const stateSelect = wrapper.find('form select[name="state"]');
    expect(stateSelect.exists()).toBe(true);
    await wrapper.findComponent(Select).vm.$emit("update:modelValue", "pausada");
    await flushPromises();

    expect(getConvocations).toHaveBeenLastCalledWith({ q: "", state: "pausada", page: 1 });
    wrapper.unmount();
  });

  it("muestra solo los estados operativos y no el conteo de expedientes", async () => {
    const wrapper = mount(CoordinationConvocationsPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();

    expect(wrapper.text()).not.toContain("Expedientes");
    expect(wrapper.findAll("th")).toHaveLength(4);

    wrapper.unmount();
  });
});
