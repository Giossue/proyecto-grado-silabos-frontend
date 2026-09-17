import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoordinationConvocationsPage from "@/pages/CoordinationConvocationsPage.vue";
import { createConvocation, getConvocations } from "@/api/convocations";
import { getSession } from "@/api/session";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  useRoute: () => ({ fullPath: "/coordinacion/convocatorias" }),
}));

vi.mock("@/api/convocations", () => ({
  getConvocations: vi.fn(),
  createConvocation: vi.fn(),
  openConvocation: vi.fn(),
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
        must_change_password: false,
        can_edit_identity: false,
      },
      active_role: { id: "role-1", code: "coordinador", career_id: "career-1", career_name: "Software" },
      available_roles: [],
    });
    vi.mocked(getConvocations).mockResolvedValue({
      filters: { q: null, state: null },
      available_sources: [{ id: "source-1", name: "Reglamento académico" }],
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

  it("exige y envía la selección explícita de fuentes", async () => {
    const wrapper = mount(CoordinationConvocationsPage, {
      attachTo: document.body,
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } },
    });
    await flushPromises();

    await wrapper.get("table tbody button").trigger("click");
    await flushPromises();
    const startItem = Array.from(document.body.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find((item) => item.textContent?.includes('Iniciar'));
    startItem?.click();
    await flushPromises();
    const submit = Array.from(document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'))
      .find((button) => button.textContent?.includes('Iniciar convocatoria'));
    expect(submit?.disabled).toBe(true);

    const source = document.body.querySelector<HTMLElement>('[role="dialog"] [role="checkbox"]');
    source?.click();
    await flushPromises();
    expect(submit?.disabled).toBe(false);
    submit?.click();
    await flushPromises();

    expect(createConvocation).toHaveBeenCalledWith("process-1", ["source-1"]);
    expect(push).toHaveBeenCalledWith("/coordinacion/convocatorias/convocation-1");
    wrapper.unmount();
  });
});
