import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SyllabusIdentificationTable from "@/components/SyllabusIdentificationTable.vue";

describe("SyllabusIdentificationTable", () => {
  it("respeta combinaciones y estilos de la cuadrícula institucional", () => {
    const wrapper = mount(SyllabusIdentificationTable, {
      props: {
        rows: [[{
          text: "FACULTAD: Ingeniería",
          span: 9,
          rows: 2,
          style: "blue",
          bold: true,
          small: false,
          center: false,
        }]],
      },
    });

    const cell = wrapper.get("td");
    expect(cell.attributes("colspan")).toBe("9");
    expect(cell.attributes("rowspan")).toBe("2");
    expect(cell.classes()).toContain("identification-blue");
    expect(cell.classes()).toContain("is-bold");
  });
});
