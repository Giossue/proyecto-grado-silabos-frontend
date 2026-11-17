import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import type { SyllabusDetail } from '@/api/syllabi';
import FieldResponseEditor from '@/components/domain/syllabus/FieldResponseEditor';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import SyllabusTeacherForm from '@/components/domain/syllabus/SyllabusTeacherForm.vue';
import { fieldCharacters } from '@/lib/fieldLimits';
import type { DocumentNode } from '@/lib/templateDocument';

type Section = SyllabusDetail['sections'][number];
const doc = (...lines: string[]): DocumentNode => ({ type: 'doc', content: lines.map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })) });
const blank = doc('');
const answer = (value: string): DocumentNode => ({ type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Detalle: ' }, { type: 'response', attrs: { kind: 'texto', options: [], value: value as never } }] },
    { type: 'paragraph' },
] });
const wrappers: Array<ReturnType<typeof mount>> = [];
const keep = <T extends ReturnType<typeof mount>>(wrapper: T): T => { wrappers.push(wrapper); return wrapper; };
const section = (value: DocumentNode, limit?: number, template: DocumentNode = blank): Section[] => [{
    id: 's1', key: 'uno', title: 'Uno', description: null, orientation: 'portrait',
    fields: [{ id: 'f1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', teacher_editable: true, required: true, template, value, ...(limit ? { max_length: limit } : {}) }],
}];
const paste = (editor: Editor, text: string): void => { editor.view.pasteText(text, new Event('paste') as ClipboardEvent); };
const lastValue = (wrapper: ReturnType<typeof mount>): DocumentNode => wrapper.emitted('update:modelValue')!.at(-1)![0] as DocumentNode;

describe('Límite de caracteres del docente', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('muestra el contador bajo el campo, en rojo al llegar y con aviso si se pasó', async () => {
        const wrapper = keep(mount(SyllabusTeacherForm, { props: { sections: section(doc('Hola mundo'), 20) }, attachTo: document.body }));
        await flushPromises();
        const counter = () => wrapper.get('[data-field-counter="f1"]');
        expect(counter().text()).toBe('10 / 20');
        expect(counter().classes()).toContain('text-muted-foreground');

        await wrapper.setProps({ sections: section(doc('Hola mundo', 'Hola mundo'), 20) });
        expect(counter().text()).toBe('20 / 20');
        expect(counter().classes()).toContain('text-destructive');

        await wrapper.setProps({ sections: section(doc('Hola mundo', 'Hola mundo', 'más'), 20) });
        expect(counter().text()).toBe('23 / 20 · Supera el límite: recorte el texto para enviar');
        expect(wrapper.get('#field-f1').attributes('data-invalid')).toBe('true');
    });

    it('sin límite no hay contador', async () => {
        const wrapper = keep(mount(SyllabusTeacherForm, { props: { sections: section(doc('Hola mundo')) }, attachTo: document.body }));
        await flushPromises();
        expect(wrapper.find('[data-field-counter]').exists()).toBe(false);
    });

    it('el editor de texto libre no acepta más texto al escribir ni al pegar', async () => {
        const wrapper = keep(mount(FreeTextEditor, { props: { id: 'libre', label: 'Contenido', modelValue: doc('Hola'), limit: 10 }, attachTo: document.body }));
        await flushPromises();
        const editor = (wrapper.vm as unknown as { editor: Editor }).editor;

        editor.chain().focus('end').insertContent(' mundo').run();
        expect(editor.getText()).toBe('Hola mundo');
        editor.chain().focus('end').insertContent('!').run();
        expect(editor.getText()).toBe('Hola mundo');

        editor.chain().setTextSelection({ from: 1, to: 5 }).run();
        paste(editor, 'Adiós, adiós');
        expect(editor.getText()).toBe('Adió mundo');
        editor.commands.selectAll();
        paste(editor, '12345678901234');
        expect(editor.getText()).toBe('1234567890');
        expect(fieldCharacters(blank, lastValue(wrapper))).toBe(10);
    });

    it('lo que ya pasaba el límite se puede recortar pero no crecer', async () => {
        const wrapper = keep(mount(FreeTextEditor, { props: { id: 'libre', label: 'Contenido', modelValue: doc('Hola mundo largo'), limit: 10 }, attachTo: document.body }));
        await flushPromises();
        const editor = (wrapper.vm as unknown as { editor: Editor }).editor;

        editor.chain().focus('end').insertContent('!').run();
        expect(editor.getText()).toBe('Hola mundo largo');
        editor.chain().focus('end').deleteRange({ from: 11, to: 17 }).run();
        expect(editor.getText()).toBe('Hola mundo');
    });

    it('en un campo con espacios, cada espacio recibe solo lo que queda del límite, también al pegar', async () => {
        const template = answer('');
        const wrapper = keep(mount(FieldResponseEditor, { props: { id: 'campo', label: 'Métodos', template, modelValue: answer('Química'), limit: 12 }, attachTo: document.body }));
        await flushPromises();
        const [response, slot] = wrapper.findAll('textarea');
        expect(response!.attributes('maxlength')).toBe('12');
        expect(slot!.attributes('maxlength')).toBe('5');

        await slot!.setValue('Laboratorio');
        const written = lastValue(wrapper);
        expect(written.content![1]!.content).toEqual([{ type: 'text', text: 'Labor' }]);
        expect(fieldCharacters(template, written)).toBe(12);

        await response!.setValue('Química orgánica');
        expect((lastValue(wrapper).content![0]!.content![1]!.attrs as { value: string }).value).toBe('Química orgá');
    });
});
