import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FormSheet from "@/components/FormSheet.vue";

describe("FormSheet", () => {
  it("mueve el foco, lo contiene y permite cerrar con Escape", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    const wrapper = mount(FormSheet, {
      attachTo: document.body,
      props: { open: true, title: "Editar registro" },
      slots: { default: '<input aria-label="Nombre"><button>Guardar</button>' },
    });
    await flushPromises();

    const close = document.body.querySelector<HTMLButtonElement>('[aria-label="Cerrar"]')!;
    expect(document.activeElement).toBe(close);
    const save = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "Guardar",
    ) as HTMLButtonElement;
    save.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(close);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(wrapper.emitted("close")).toHaveLength(1);
    await wrapper.setProps({ open: false });
    expect(document.activeElement).toBe(opener);

    wrapper.unmount();
    opener.remove();
  });
});
