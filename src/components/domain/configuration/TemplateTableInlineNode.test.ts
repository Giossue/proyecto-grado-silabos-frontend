import { Editor, EditorContent } from '@tiptap/vue-3';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { defineComponent, h, shallowRef } from 'vue';
import { templateTableExtensions } from '@/components/domain/configuration/template-table/templateTableExtensions';
import { TooltipProvider } from '@/components/ui/tooltip';

const editors: Editor[] = [];
afterEach(() => { editors.splice(0).forEach((editor) => editor.destroy()); document.body.innerHTML = ''; });

const field = (key: string, label: string, extra: Record<string, unknown> = {}) => ({ type: 'field', attrs: { key, label, kind: 'texto_largo', ...extra } });
const mountSheet = () => {
    const editor = new Editor({
        extensions: templateTableExtensions(),
        content: { type: 'doc', content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Estudiantes con discapacidad: ' }, field('discapacidad', 'Estudiantes con discapacidad', { kind: 'seleccion_unica', options: ['Sí', 'No'] })] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Tipo: ' }, field('tipo', 'Tipo de discapacidad')] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Adaptación: ' }, field('adaptacion', 'Adaptación curricular')] },
        ] },
    });
    editors.push(editor);
    mount(defineComponent({ setup: () => { const current = shallowRef(editor); return () => h(TooltipProvider, () => h(EditorContent, { editor: current.value })); } }), { attachTo: document.body });

    return editor;
};
const chip = (key: string) => document.querySelector<HTMLElement>(`[data-template-field="${key}"]`)!;
const showWhen = (editor: Editor, index: number) =>
    (editor.getJSON().content![index]!.content![1] as { attrs: { showWhen: unknown } }).attrs.showWhen;
const openTrigger = async () => {
    if (!document.getElementById('follow-up-discapacidad-tipo')) {
        chip('discapacidad').querySelector('button')!.click();
        await flushPromises();
    }
};

describe('preguntas de seguimiento en la hoja (I-159)', () => {
    it('la regla se define en el Sí/No y la hoja numera la pregunta con sus dependientes', async () => {
        const editor = mountSheet();
        await flushPromises();
        expect(chip('tipo').querySelector('button')).toBeNull();
        await openTrigger();
        expect(document.body.textContent).toContain('Si responde');
        expect(document.body.textContent).toContain('pedir también:');
        expect(document.body.textContent).toContain('Tipo de discapacidad');
        expect(document.body.textContent).toContain('Adaptación curricular');

        document.getElementById('follow-up-discapacidad-tipo')!.click();
        await flushPromises();
        expect(showWhen(editor, 1)).toEqual({ key: 'discapacidad', value: 'Sí' });
        expect(showWhen(editor, 2)).toBeNull();
        expect(chip('discapacidad').textContent?.trim()).toBe('Docente: Sí o No ①');
        expect(chip('tipo').textContent?.trim()).toBe('Docente ①');
        expect(chip('tipo').dataset.conditionGroup).toBe('discapacidad');

        await openTrigger();
        document.getElementById('follow-up-discapacidad-answer-No')!.click();
        await flushPromises();
        expect(showWhen(editor, 1)).toEqual({ key: 'discapacidad', value: 'No' });

        await openTrigger();
        document.getElementById('follow-up-discapacidad-tipo')!.click();
        await flushPromises();
        expect(showWhen(editor, 1)).toBeNull();
        expect(chip('tipo').textContent?.trim()).toBe('Docente');
    });

    it('en el formato UEB cada casilla «X» define las preguntas de su propia respuesta', async () => {
        const editor = new Editor({
            extensions: templateTableExtensions(),
            content: { type: 'doc', content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Sí ' }, field('discapacidad', 'Estudiantes con discapacidad', { kind: 'seleccion_unica', choice: 'Sí' })] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Tipo: ' }, field('tipo', 'Tipo de discapacidad')] },
                { type: 'paragraph', content: [{ type: 'text', text: 'No ' }, field('discapacidad', 'Estudiantes con discapacidad', { kind: 'seleccion_unica', choice: 'No' })] },
            ] },
        });
        editors.push(editor);
        mount(defineComponent({ setup: () => { const current = shallowRef(editor); return () => h(TooltipProvider, () => h(EditorContent, { editor: current.value })); } }), { attachTo: document.body });
        await flushPromises();

        const [yes, no] = document.querySelectorAll<HTMLElement>('[data-template-field="discapacidad"]');
        const open = async (target: HTMLElement) => {
            document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            await flushPromises();
            target.querySelector('button')!.click();
            await flushPromises();
        };

        await open(yes!);
        expect(document.body.textContent).toContain('Si marca «Sí», pedir también:');
        expect(document.body.textContent).not.toContain('Si responde');
        document.getElementById('follow-up-discapacidad-Sí-tipo')!.click();
        await flushPromises();
        expect(showWhen(editor, 1)).toEqual({ key: 'discapacidad', value: 'Sí' });
        expect(document.querySelectorAll('[data-condition-group="discapacidad"]')).toHaveLength(3);
        expect(yes!.textContent?.trim()).toBe('X ①');
        expect(yes!.querySelector('button')!.hasAttribute('title')).toBe(false);
        yes!.querySelector('button')!.focus();
        await flushPromises();
        expect(document.querySelector('[role=tooltip]')?.textContent).toBe('Se marca con X si el docente responde Sí en «Estudiantes con discapacidad» (pregunta ①)');

        await open(no!);
        expect(document.body.textContent).toContain('Si marca «No», pedir también:');
        const checkbox = document.getElementById('follow-up-discapacidad-No-tipo')!;
        expect(checkbox.getAttribute('aria-checked')).toBe('false');
        expect(document.body.textContent).toContain('(ahora con «Sí»)');
        checkbox.click();
        await flushPromises();
        expect(showWhen(editor, 1)).toEqual({ key: 'discapacidad', value: 'No' });
    });
});
