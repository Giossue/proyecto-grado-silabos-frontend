import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import AutomaticFieldEditor from '@/components/domain/fieldTypes/AutomaticFieldEditor.vue';
import AutomaticFieldView from '@/components/domain/fieldTypes/AutomaticFieldView.vue';
import FixedFieldEditor from '@/components/domain/fieldTypes/FixedFieldEditor.vue';
import FixedFieldView from '@/components/domain/fieldTypes/FixedFieldView.vue';
import ProfileFieldEditor from '@/components/domain/fieldTypes/ProfileFieldEditor.vue';
import ProfileFieldView from '@/components/domain/fieldTypes/ProfileFieldView.vue';
import TableFieldEditor from '@/components/domain/fieldTypes/TableFieldEditor.vue';
import TableFieldView from '@/components/domain/fieldTypes/TableFieldView.vue';
import TextFieldEditor from '@/components/domain/fieldTypes/TextFieldEditor.vue';
import TextFieldView from '@/components/domain/fieldTypes/TextFieldView.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import type { TypedField } from '@/types/configuration';

const doc = (text: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
const base = (type: string, extra: Partial<TypedField> = {}): TypedField => ({ id: 'f1', key: 'campo', label: 'Campo', type, value: null, ...extra });
const stubs = { FreeTextEditor: { props: ['modelValue', 'id', 'label'], emits: ['update:modelValue'], template: '<div class="free-text-stub" :id="id" />' } };
const table = base('tabla', {
    config: { columns: [{ key: 'horas', label: 'Horas' }, { key: 'tema', label: 'Tema' }], rows: [{ key: 's1', label: 'Semana 1' }, { key: 's2', label: 'Semana 2' }] },
    value: { s1: { horas: '2', tema: 'Intro' } },
});

describe('Componentes por tipo de campo', () => {
    it('texto: el editor reutiliza FreeTextEditor y la vista pinta el documento', async () => {
        const editor = mount(TextFieldEditor, { props: { field: base('texto'), modelValue: doc('Hola') }, global: { stubs } });
        expect(editor.find('.free-text-stub').attributes('id')).toBe('input-f1');
        editor.findComponent(FreeTextEditor).vm.$emit('update:modelValue', doc('Nuevo'));
        expect(editor.emitted('update:modelValue')![0]).toEqual([doc('Nuevo')]);
        expect(mount(TextFieldView, { props: { field: base('texto', { value: doc('Hola') }) } }).text()).toBe('Hola');
        expect(mount(TextFieldView, { props: { field: base('texto') } }).text()).toBe('Sin contenido');
    });

    it('ficha: se edita solo si es ajustable; si no, queda heredada en solo lectura', () => {
        const adjustable = mount(ProfileFieldEditor, { props: { field: base('ficha', { config: { adjustable: true } }), modelValue: doc('Heredado') }, global: { stubs } });
        expect(adjustable.find('.free-text-stub').exists()).toBe(true);
        const locked = mount(ProfileFieldEditor, { props: { field: base('ficha', { config: { adjustable: false } }), modelValue: doc('Heredado') }, global: { stubs } });
        expect(locked.find('.free-text-stub').exists()).toBe(false);
        expect(locked.text()).toContain('Heredado');
        const empty = mount(ProfileFieldView, { props: { field: base('ficha', { config: [] }) } });
        expect(empty.text()).toContain('Pendiente de Coordinación');
    });

    it('tabla: filas y columnas fijas, edita una celda sin agregar filas', async () => {
        const editor = mount(TableFieldEditor, { props: { field: table, modelValue: table.value } });
        const inputs = editor.findAll('input');
        expect(inputs).toHaveLength(4);
        expect(inputs[0]!.attributes('aria-label')).toBe('Semana 1, Horas');
        expect(editor.text()).toContain('Semana 2');
        expect(editor.findAll('button')).toHaveLength(0);
        await inputs[3]!.setValue('Cierre');
        expect(editor.emitted('update:modelValue')![0]).toEqual([{ s1: { horas: '2', tema: 'Intro' }, s2: { horas: '', tema: 'Cierre' } }]);
        const view = mount(TableFieldView, { props: { field: table } });
        expect(view.text()).toContain('Intro');
        expect(view.findAll('tbody tr')).toHaveLength(2);
    });

    it('automático: solo lectura; la fuente identification_card pinta la tabla oficial', () => {
        const card = base('automatico', {
            config: { source: 'identification_card' },
            document: { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 2, backgroundColor: '#4F81BD' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'FACULTAD: FCAGEI' }] }] }] }] }] },
        });
        for (const component of [AutomaticFieldView, AutomaticFieldEditor]) {
            const wrapper = mount(component, { props: { field: card } });
            expect(wrapper.find('table').exists()).toBe(true);
            expect(wrapper.text()).toContain('FACULTAD: FCAGEI');
            expect(wrapper.find('input, textarea').exists()).toBe(false);
        }
        expect(mount(AutomaticFieldView, { props: { field: base('automatico', { config: [] }) } }).text()).toContain('automáticamente');
    });

    it('fijo: solo lectura con el contenido institucional', () => {
        const fixed = base('fijo', { config: { content: doc('Conducta ética') }, value: doc('Conducta ética') });
        expect(mount(FixedFieldView, { props: { field: fixed } }).text()).toBe('Conducta ética');
        const editor = mount(FixedFieldEditor, { props: { field: fixed } });
        expect(editor.text()).toBe('Conducta ética');
        expect(editor.find('input, textarea, [contenteditable]').exists()).toBe(false);
        expect(mount(FixedFieldView, { props: { field: base('fijo', { config: { content: doc('Desde la config') } }) } }).text()).toBe('Desde la config');
    });
});
