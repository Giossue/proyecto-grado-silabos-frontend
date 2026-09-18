import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminTemplatePage from "@/pages/AdminTemplatePage.vue";
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from "@/api/session";
import { getTemplate, type TemplatePayload } from "@/api/template";

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ replace: vi.fn() }),
  useRoute: () => ({ fullPath: '/administracion/plantilla' }),
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
  identificationSample: [],
  variables: [{ key: "nombre_asignatura", label: "Asignatura", sample: "Inteligencia Artificial" }],
  identificationDesign: { type: "doc", content: [] },
  logos: {
    institution: '/logo.png', faculty: '/faculty.png',
    institution_size: { width: 120, height: 40 }, faculty_size: { width: 120, height: 40 },
  },
  blockTypes: [{ value: 'text', label: 'Texto' }],
  appearanceOptions: {
    fonts: [{ value: 'Arial', label: 'Arial' }],
    body_sizes: [{ value: 11, label: '11' }],
    title_sizes: [{ value: 16, label: '16' }],
    section_sizes: [{ value: 13, label: '13' }],
    field_sizes: [{ value: 11, label: '11' }],
    margins: [{ value: 2.5, label: '2.5' }],
    colors: [{ value: '#075da9', label: 'Azul' }],
    alignments: [{ value: 'left', label: 'Izquierda' }],
    orientations: [{ value: 'portrait', label: 'Vertical' }],
  },
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
      user: { id: "admin-1", name: "Administración", email: "admin@ueb.edu.ec", email_verified: true, can_edit_identity: true },
      active_role: { id: "role-1", code: "administrador", career_id: null, career_name: null },
      available_roles: [],
    });
    vi.mocked(getTemplate).mockResolvedValue(payload);
  });

  it("muestra el documento estructurado y activa el editor canónico", async () => {
    const wrapper = mount({
      components: { AdminTemplatePage, TooltipProvider },
      template: '<TooltipProvider><AdminTemplatePage /></TooltipProvider>',
    }, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.get(".template-document-view").text()).toContain("Fundamentos de la asignatura.");
    const edit = wrapper.findAll('button').find((button) => button.text().trim() === 'Editar');
    expect(edit).toBeDefined();
    await edit!.trigger("click");
    await flushPromises();
    await wrapper.get('[aria-label="Campo Descripción"]').trigger("pointerdown");
    await flushPromises();

    expect(document.body.textContent).toContain('Campo · Descripción');
    expect(document.body.textContent).toContain('Editar campo');
  });
});
