import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CurriculumCycleBoard from "./CurriculumCycleBoard.vue";

const subject = {
  id: "subject-1",
  code: "SW-01",
  name: "Programación",
  cycle: 1,
  position: 0,
  organization_unit: "Unidad profesional",
  modality: null,
  modality_label: null,
  credits: "3",
  total_hours: 144,
  active: true,
  system_values: {},
  display_fields: [],
};

describe("CurriculumCycleBoard", () => {
  it("organiza materias por ciclo y emite una nueva posición", async () => {
    const wrapper = mount(CurriculumCycleBoard, {
      props: { subjects: [subject], cycleCount: 2 },
    });

    expect(wrapper.text()).toContain("Ciclo 1");
    expect(wrapper.text()).toContain("Programación");
    expect(wrapper.text()).toContain("Sin materias.");

    await wrapper.get("select").setValue("2");
    await wrapper.get('input[type="number"]').setValue("4");
    await wrapper.get('button[type="submit"]').trigger("submit");

    expect(wrapper.emitted("layout")?.[0]).toEqual([
      { subject_id: "subject-1", cycle: 2, position: 4 },
    ]);
  });

  it("expone las acciones de la materia", async () => {
    const wrapper = mount(CurriculumCycleBoard, {
      props: { subjects: [subject], cycleCount: 1 },
    });

    const buttons = wrapper.findAll(".subject-actions button");
    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");
    await buttons[2]?.trigger("click");

    expect(wrapper.emitted("edit")?.[0]).toEqual([subject]);
    expect(wrapper.emitted("status")?.[0]).toEqual([subject]);
    expect(wrapper.emitted("remove")?.[0]).toEqual([subject]);
  });
});
