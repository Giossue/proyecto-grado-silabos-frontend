import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CoordinationConvocationsPage from "@/pages/CoordinationConvocationsPage.vue";
import { createConvocation, getConvocations } from "@/api/convocations";
import { getSession } from "@/api/session";

const push = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/api/convocations", () => ({
  getConvocations: vi.fn(),
  createConvocation: vi.fn(),
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
    const submit = document.body.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(true);

    const source = document.body.querySelector<HTMLInputElement>('input[value="source-1"]');
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
