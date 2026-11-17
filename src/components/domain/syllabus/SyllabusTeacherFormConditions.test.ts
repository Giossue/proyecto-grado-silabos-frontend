import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { SyllabusDetail } from '@/api/syllabi';
import SyllabusTeacherForm from '@/components/domain/syllabus/SyllabusTeacherForm.vue';
import type { DocumentNode } from '@/lib/templateDocument';

type Section = SyllabusDetail['sections'][number];
const yesNo = [{ const: 'o1', title: 'Sí' }, { const: 'o2', title: 'No' }];
const ifYes = { response: 'usa_lab', options: ['o1'] };
const methods = (choice: string | null): DocumentNode => ({ type: 'doc', content: [
    { type: 'paragraph', content: [{ type: 'text', text: '¿Usa laboratorio? ' }, { type: 'response', attrs: { kind: 'una', options: yesNo, value: choice as never, id: 'usa_lab' } }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Cuál: ' }, { type: 'response', attrs: { kind: 'texto', options: [], value: '', showIf: ifYes } }] },
] });
const empty: DocumentNode = { type: 'doc', content: [{ type: 'paragraph' }] };
const sections = (choice: string | null): Section[] => [{
    id: 's1', key: 'metodologia', title: 'Metodología', description: null, orientation: 'portrait',
    fields: [
        { id: 'f1', key: 'metodologia', label: 'Métodos', quien_llena: 'carrera', teacher_editable: true, required: true, template: methods(null), value: methods(choice) },
        { id: 'f2', key: 'tecnicas', label: 'Técnicas', quien_llena: 'carrera', teacher_editable: true, required: true, template: empty, value: empty, show_if: ifYes },
    ],
}];
const wrappers: Array<ReturnType<typeof mount>> = [];

describe('El docente responde con «Mostrar solo si»', () => {
    afterEach(() => { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); document.body.innerHTML = ''; });

    it('lo condicionado aparece en vivo al elegir la opción y se vuelve a ocultar al cambiarla', async () => {
        const wrapper = mount(SyllabusTeacherForm, { props: { sections: sections(null) }, attachTo: document.body });
        wrappers.push(wrapper);
        await flushPromises();
        expect(wrapper.find('[data-field-key="metodologia"]').exists()).toBe(true);
        expect(wrapper.find('[data-field-key="tecnicas"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('Técnicas');
        expect(wrapper.findAll('[data-field-key="metodologia"] textarea')).toHaveLength(0);

        await wrapper.setProps({ sections: sections('o1') });
        expect(wrapper.find('[data-field-key="tecnicas"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-field-key="metodologia"] textarea')).toHaveLength(1);

        await wrapper.setProps({ sections: sections('o2') });
        expect(wrapper.find('[data-field-key="tecnicas"]').exists()).toBe(false);
        expect(wrapper.findAll('[data-field-key="metodologia"] textarea')).toHaveLength(0);
    });
});
