import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import VisualMarkdownEditor from "@/components/VisualMarkdownEditor.vue";

describe("VisualMarkdownEditor", () => {
  it("muestra Markdown como documento y conserva el formato al editar", async () => {
    const wrapper = mount(VisualMarkdownEditor, {
      props: { label: "Fuente", modelValue: "## Normativa\n\nTexto **importante**." },
    });
    const page = wrapper.get(".visual-editor-page");

    expect(page.find("h2").text()).toBe("Normativa");
    expect(page.find("strong").text()).toBe("importante");

    page.element.innerHTML = "<h3>Aplicación</h3><p>Contenido actualizado.</p>";
    await page.trigger("input");

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([
      "### Aplicación\n\nContenido actualizado.",
    ]);
  });

  it("bloquea la edición cuando la fuente está protegida", () => {
    const wrapper = mount(VisualMarkdownEditor, {
      props: { label: "Fuente", modelValue: "Texto", disabled: true },
    });

    expect(wrapper.get(".visual-editor-page").attributes("contenteditable")).toBe("false");
    expect(wrapper.get(".visual-editor-toolbar button").attributes("disabled")).toBeDefined();
  });
});
