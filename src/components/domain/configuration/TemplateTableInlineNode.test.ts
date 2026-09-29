import { Editor } from '@tiptap/core';
import { EditorContent } from '@tiptap/vue-3';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, shallowRef } from 'vue';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import { TooltipProvider } from '@/components/ui/tooltip';

const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach((editor) => editor.destroy()); document.body.innerHTML = ''; });

const mountSheet = () => {
    const editor = new Editor({
        extensions: templateTableExtensions({ conditionTriggers: () => [{ key: 'discapacidad', label: 'Estudiantes con discapacidad', options: ['Sí', 'No'] }] }),
        content: { type: 'doc', content: [{ type: 'paragraph', content: [
            { type: 'text', text: 'Tipo: ' },
            { type: 'field', attrs: { key: 'tipo', label: 'Tipo', kind: 'texto_largo' } },
        ] }] },
    });
    editors.push(editor);
    const wrapper = mount(defineComponent({ setup: () => { const current = shallowRef(editor); return () => h(TooltipProvider, () => h(EditorContent, { editor: current.value })); } }), { attachTo: document.body });

    return { editor, wrapper };
};

describe('ficha Docente en la hoja', () => {
    it('se elige en la ficha cuándo se pide y queda guardado en el documento (I-158)', async () => {
        const { editor } = mountSheet();
        await flushPromises();
        const chip = document.querySelector<HTMLButtonElement>('[data-template-field="tipo"] button')!;
        expect(chip.textContent?.trim()).toBe('Docente');
        expect(chip.getAttribute('aria-label')).toContain('se pide siempre');

        chip.click();
        await flushPromises();
        expect(document.body.textContent).toContain('¿Cuándo se pide?');
        expect(document.body.textContent).toContain('Solo si «Estudiantes con discapacidad» es Sí');
        document.getElementById('condition-tipo-1')!.click();
        await flushPromises();

        const field = editor.getJSON().content![0]!.content![1]!;
        expect(field.attrs!.showWhen).toEqual({ key: 'discapacidad', value: 'Sí' });
        expect(document.querySelector('[data-template-field="tipo"] button')!.textContent?.trim()).toBe('Docente · condicional');

        // La ventana puede seguir abierta tras elegir; si se cerró, se vuelve a abrir.
        if (!document.getElementById('condition-tipo-0')) {
            document.querySelector<HTMLButtonElement>('[data-template-field="tipo"] button')!.click();
            await flushPromises();
        }
        document.getElementById('condition-tipo-0')!.click();
        await flushPromises();
        expect(editor.getJSON().content![0]!.content![1]!.attrs!.showWhen).toBeNull();
    });
});
