import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TemplateTableDesigner from "@/components/TemplateTableDesigner.vue";
import type { TemplateTableLayout } from "@/api/template";

const layout: TemplateTableLayout = {
  columns: [
    {
      key: "contenido",
      label: "Contenido",
      type: "text",
      group: null,
      band: null,
      role: null,
      sum: false,
      width: null,
    },
  ],
  groups: [],
  bands: [],
  header_fields: [],
  totals: { enabled: false, label: "Total" },
  repeat: { enabled: false, label: "Unidad" },
};

describe("TemplateTableDesigner", () => {
  it("agrega columnas y emite un contrato estructurado", async () => {
    const wrapper = mount(TemplateTableDesigner, {
      props: { layout, fingerprint: "a".repeat(64) },
    });

    const addColumn = wrapper
      .findAll("button")
      .find((button) => button.text() === "Agregar columna");
    await addColumn?.trigger("click");
    const cards = wrapper.findAll(".table-column-card");
    expect(cards).toHaveLength(2);
    await cards[1]!.find('input[required]').setValue("Evaluación");
    const save = wrapper
      .findAll("button")
      .find((button) => button.text() === "Guardar estructura de tabla");
    await save?.trigger("click");

    const payload = wrapper.emitted("save")?.[0]?.[0] as
      | (TemplateTableLayout & { fingerprint: string })
      | undefined;
    expect(payload?.columns).toHaveLength(2);
    expect(payload?.columns[1]?.label).toBe("Evaluación");
    expect(payload?.fingerprint).toBe("a".repeat(64));
  });

  it("no permite eliminar la única columna", () => {
    const wrapper = mount(TemplateTableDesigner, {
      props: { layout, fingerprint: "b".repeat(64) },
    });

    expect(wrapper.get(".table-column-order button:last-child").attributes("disabled")).toBeDefined();
  });
});
