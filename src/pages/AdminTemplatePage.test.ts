import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { getSession } from "@/api/session";
import { getTemplate, type TemplatePayload } from "@/api/template";

vi.mock("vue-router", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/api/session", () => ({ getSession: vi.fn() }));

vi.mock("@/api/template", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/template")>()),
  getTemplate: vi.fn(),
  createTemplate: vi.fn(),
  createTemplateField: vi.fn(),
  createTemplateSection: vi.fn(),
  deleteTemplateBlock: vi.fn(),
  deleteTemplateSection: vi.fn(),
  reorderTemplateBlocks: vi.fn(),
  reorderTemplateSections: vi.fn(),
  updateTemplateAppearance: vi.fn(),
  updateTemplateDocument: vi.fn(),
  updateTemplateField: vi.fn(),
  updateTemplateSection: vi.fn(),
  updateTemplateTable: vi.fn(),
  updateTemplateTitle: vi.fn(),
  uploadInstitutionLogo: vi.fn(),
}));

const payload: TemplatePayload = {
  processLock: null,
  variables: [{ key: "nombre_asignatura", label: "Asignatura", sample: "Inteligencia Artificial" }],
  identificationDesign: { type: "doc", content: [] },
  template: {
    id: "template-1",
    name: "Plantilla institucional",
    description: null,
    appearance: {
      font_family: "Arial", body_font_size: 11, title_font_size: 16, section_font_size: 13,
      field_font_size: 11, text_color: "#000000", accent_color: "#075da9",
      table_header_background: "#dbe6f4", table_header_color: "#315f92", margin_cm: 2.5,
      orientation: "portrait", title_bold: true, title_italic: false, title_alignment: "center",
      section_bold: true, section_italic: false, section_alignment: "left", body_alignment: "left",
    },
    titleBlock: { text: "PROGRAMA DE ASIGNATURA (SÍLABO)" },
    sections: [{
      id: "section-1", key: "descripcion", title: "Descripción de la asignatura", description: null,
      blocks: [{
        id: "block-1", key: "descripcion_principal", title: "Descripción", type: "narrativa",
        content_type: "text", table: null, fingerprint: "a".repeat(64),
        document: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Fundamentos de la asignatura. " }, { type: "field", attrs: { key: "descripcion", label: "Descripción de la asignatura", kind: "markdown", choice: null } }] }] },
        fields: [{
          id: "field-1", block_id: "block-1", key: "descripcion", label: "Descripción de la asignatura",
          help: null, type: "markdown", options: [], required: true, inherited: false,
          master_source: null, teacher_editable: true, ai_enabled: true,
          ai_coordinator_configurable: true, content_type: "text",
        }],
      }],
    }],
  },
};

describe("AdminTemplatePage", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: "admin-1", name: "Administración", email: "admin@ueb.edu.ec", email_verified: true, must_change_password: false },
      active_role: { id: "role-1", code: "administrador", career_id: null, career_name: null },
      available_roles: [],
    });
    vi.mocked(getTemplate).mockResolvedValue(payload);
  });

  it("muestra el documento estructurado y abre el diseño dedicado", async () => {
    const wrapper = mount(AdminTemplatePage);
    await flushPromises();

    expect(wrapper.get(".template-document-view").text()).toContain("Fundamentos de la asignatura.");
    await wrapper.get('button').trigger("click");
    await wrapper.get('[aria-label="Campo Descripción"]').trigger("pointerdown");
    await wrapper.findAll("button").find((button) =>
      button.text().includes("Editar diseño del documento"),
    )?.trigger("click");
    await flushPromises();

    expect(wrapper.get('[aria-label="Editor de diseño de plantilla"]').text()).toContain("Descripción");
    expect(wrapper.get('[aria-label="Editor de diseño de plantilla"]').text()).toContain("Salir del diseño");
  });
});
