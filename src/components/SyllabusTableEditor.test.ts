import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SyllabusTableEditor from "@/components/SyllabusTableEditor.vue";
import type { RepeatableRow, TableLayout } from "@/api/syllabi";

const layout: TableLayout = {
  columns: [{
    key: "semana",
    label: "Semana",
    type: "number",
    group: null,
    band: null,
    sum: false,
    width: null,
    role: "week",
  }],
  groups: [],
  bands: [],
  header_fields: [{ key: "nombre", label: "Nombre de la unidad" }],
  totals: { enabled: false, label: "Total" },
  repeat: { enabled: true, label: "Unidad" },
};

describe("SyllabusTableEditor", () => {
  it("conserva cabecera y pertenencia de las filas de cada unidad", async () => {
    const wrapper = mount(SyllabusTableEditor, {
      props: { layout, rows: [] },
    });

    await wrapper.get(".unit-header-field textarea").setValue("Fundamentos");
    const first = wrapper.emitted("update:rows")?.at(-1)?.[0] as RepeatableRow[];
    expect(first[0]?.data).toMatchObject({
      _unit: 1,
      _kind: "unit",
      nombre: "Fundamentos",
    });

    await wrapper.setProps({ rows: first });
    const addRow = wrapper
      .findAll("button")
      .find((button) => button.text() === "Agregar fila");
    await addRow?.trigger("click");
    const second = wrapper.emitted("update:rows")?.at(-1)?.[0] as Array<{
      position: number;
      data: Record<string, unknown>;
    }>;
    expect(second[1]?.data).toMatchObject({ _unit: 1, semana: null });
    expect(second.map((row) => row.position)).toEqual([1, 2]);
  });

  it("agrega una unidad consecutiva con su cabecera", async () => {
    const wrapper = mount(SyllabusTableEditor, {
      props: { layout, rows: [] },
    });

    const addUnit = wrapper
      .findAll("button")
      .find((button) => button.text() === "Agregar unidad");
    await addUnit?.trigger("click");
    const rows = wrapper.emitted("update:rows")?.[0]?.[0] as Array<{
      data: Record<string, unknown>;
    }>;

    expect(rows[0]?.data).toMatchObject({ _unit: 1, _kind: "unit" });
    expect(rows[1]?.data).toMatchObject({ _unit: 2, _kind: "unit" });
  });
});
