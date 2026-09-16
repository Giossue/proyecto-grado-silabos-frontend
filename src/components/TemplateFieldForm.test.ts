import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TemplateFieldForm from "@/components/TemplateFieldForm.vue";
import type { TemplateFieldDraft } from "@/api/template";

const draft = (): TemplateFieldDraft => ({
  key: "resultado",
  label: "Resultado",
  help: "",
  content_type: "text",
  options: [],
  ai_enabled: false,
  ai_coordinator_configurable: true,
});

const contentTypes = [
  { value: "text" as const, label: "Texto" },
  { value: "boolean" as const, label: "Sí / No" },
  { value: "multiple_choice" as const, label: "Selección múltiple" },
];

describe("TemplateFieldForm", () => {
  it("crea las opciones mínimas al elegir selección múltiple", async () => {
    const wrapper = mount(TemplateFieldForm, {
      props: { modelValue: draft(), contentTypes },
    });

    await wrapper.get("select").setValue("multiple_choice");

    const emissions = wrapper.emitted("update:modelValue") ?? [];
    expect(emissions[0]?.[0]).toMatchObject({ content_type: "multiple_choice" });
    expect(emissions[1]?.[0]).toMatchObject({
      options: [
        { value: "opcion_1", label: "Opción 1" },
        { value: "opcion_2", label: "Opción 2" },
      ],
    });
  });

  it("permite editar la etiqueta institucional sin cambiar su tipo ni IA", () => {
    const wrapper = mount(TemplateFieldForm, {
      props: {
        modelValue: draft(),
        contentTypes,
        typeLocked: true,
        aiAvailable: false,
      },
    });

    expect(wrapper.get('input[value="Resultado"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get("select").attributes("disabled")).toBeDefined();
    expect(wrapper.findAll('.checkbox-row')).toHaveLength(0);
  });
});
