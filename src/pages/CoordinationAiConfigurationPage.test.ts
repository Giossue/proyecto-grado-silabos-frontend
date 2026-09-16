import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import {
  getCareerAiConfiguration,
  resetCareerAiConfiguration,
  saveCareerAiConfiguration,
} from "@/api/ai-configuration";
import CoordinationAiConfigurationPage from "@/pages/CoordinationAiConfigurationPage.vue";

vi.mock("@/api/ai-configuration", () => ({
  getCareerAiConfiguration: vi.fn(),
  resetCareerAiConfiguration: vi.fn(),
  saveCareerAiConfiguration: vi.fn(),
}));

const configuration = {
  template_revision: 3,
  fields: [
    {
      id: "field-1",
      section: "Descripción",
      label: "Objetivo general",
      admin_default: true,
      coordinator_configurable: true,
      override: null,
      effective: true,
    },
  ],
};

describe("CoordinationAiConfigurationPage", () => {
  beforeEach(() => {
    vi.mocked(getCareerAiConfiguration).mockReset();
    vi.mocked(resetCareerAiConfiguration).mockReset();
    vi.mocked(saveCareerAiConfiguration).mockReset();
    vi.mocked(getCareerAiConfiguration).mockResolvedValue(configuration);
  });

  it("muestra el estado de carga hasta recibir la configuración", async () => {
    let resolveConfiguration: ((value: typeof configuration) => void) | undefined;
    vi.mocked(getCareerAiConfiguration).mockReturnValue(
      new Promise((resolve) => {
        resolveConfiguration = resolve;
      }),
    );

    const wrapper = mount(CoordinationAiConfigurationPage);
    expect(wrapper.text()).toContain("Cargando configuración de IA");
    resolveConfiguration?.(configuration);
    await flushPromises();
    expect(wrapper.text()).toContain("Objetivo general");
  });

  it("informa un fallo al restablecer y vuelve a habilitar las acciones", async () => {
    vi.mocked(resetCareerAiConfiguration).mockRejectedValue(
      new ApiError("No se pudo restablecer.", 503),
    );
    const wrapper = mount(CoordinationAiConfigurationPage);
    await flushPromises();

    const reset = wrapper.findAll("button").find((button) =>
      button.text().includes("Restablecer valores"),
    );
    await reset?.trigger("click");
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toContain("No se pudo restablecer");
    expect(reset?.attributes("disabled")).toBeUndefined();
  });
});
