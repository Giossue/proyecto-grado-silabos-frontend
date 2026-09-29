import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import TemplateFieldActions from '@/components/domain/configuration/TemplateFieldActions.vue';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { TemplateField, TemplateFieldContainer } from '@/types/configuration';

vi.mock('@/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/client')>()),
    api: vi.fn().mockResolvedValue({}),
}));

const part = (key: string, label: string, extra: Partial<TemplateField> = {}): TemplateField => ({
    id: `field-${key}`, block_id: 'block-1', key, label, help: null, type: 'texto_corto',
    options: [], required: true, inherited: false, master_source: null, teacher_editable: true,
    document_marker: null, content_type: 'text', ...extra,
});

const block = (fields: TemplateField[]): TemplateFieldContainer => ({
    id: 'block-1', key: 'bloque', title: 'Tipo de discapacidad', type: 'narrativa',
    content_type: 'text', document: null, fingerprint: 'a'.repeat(64), fields,
});

const mountActions = (field: TemplateFieldContainer, sectionId = 'identificacion') => mount({
    components: { TemplateFieldActions, TooltipProvider },
    setup: () => ({
        field,
        sectionId,
        choiceFields: [{
            key: 'discapacidad_tiene', label: 'Estudiantes con discapacidad', sectionId: 'identificacion',
            options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }],
        }],
    }),
    template: '<TooltipProvider><TemplateFieldActions ref="actions" template-id="template-1" section-title="Datos" :section-id="sectionId" :field="field" :choice-fields="choiceFields" /></TooltipProvider>',
}, { attachTo: document.body });

describe('TemplateFieldActions', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.mocked(api).mockClear();
    });

    it('sin marcar, la parte se pide siempre y se guarda sin condición', async () => {
        const wrapper = mountActions(block([part('discapacidad_tipo', 'Tipo de discapacidad')]));
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).toContain('Si en «Estudiantes con discapacidad» responden');
        expect(document.body.textContent).not.toContain('Mostrar solo si');
        expect(document.getElementById('depends-discapacidad_tiene-discapacidad_tipo')?.getAttribute('data-state')).toBe('unchecked');

        (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await flushPromises();
        const body = JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body));
        expect(body.show_when).toBeNull();
    });

    it('muestra la forma de la parte sin permitir cambiarla', async () => {
        const wrapper = mountActions(block([part('discapacidad_tipo', 'Tipo de discapacidad')]));
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).toContain('Forma: Párrafo.');
        expect(document.body.textContent).toContain('Para usar otra forma, elimine la parte y cree una nueva.');
        expect(document.getElementById('edit-template-field-form')).toBeNull();
    });

    it('muestra la respuesta configurada y la guarda en la parte dependiente', async () => {
        const wrapper = mountActions(block([part('discapacidad_tipo', 'Tipo de discapacidad', {
            show_when: { key: 'discapacidad_tiene', value: 'Sí' },
        })]));
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.getElementById('depends-discapacidad_tiene-discapacidad_tipo')?.getAttribute('data-state')).toBe('checked');
        expect(document.getElementById('trigger-value-discapacidad_tiene')?.textContent).toContain('Sí');

        (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await flushPromises();
        const body = JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body));
        expect(body.show_when).toEqual({ key: 'discapacidad_tiene', value: 'Sí' });
    });

    it('no ofrece preguntas de otra sección', async () => {
        const wrapper = mountActions(block([part('confirmacion', 'Confirmación', { type: 'booleano', content_type: 'boolean' })]), 'descripcion');
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).not.toContain('Preguntas que dependen de una respuesta');
        expect(document.body.textContent).not.toContain('Estudiantes con discapacidad');
    });

    const identification = () => ({
        ...block([
            part('discapacidad_tiene', 'Estudiantes con discapacidad', { type: 'seleccion_unica', content_type: 'multiple_choice' }),
            part('discapacidad_tipo', 'Tipo de discapacidad'),
            part('formacion_experiencia', 'Formación y experiencia', { type: 'texto_largo' }),
        ]),
        title: 'Identificación institucional',
        content_type: 'institutional' as const,
        document: { type: 'doc', content: [] },
    });

    it('en la ficha de identificación permite renombrar cada pregunta y elegir qué pedir según la respuesta', async () => {
        const wrapper = mountActions(identification());
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).toContain('Preguntas que llena el docente');
        expect(document.body.textContent?.match(/Preguntas que dependen de una respuesta/g)).toHaveLength(1);
        expect(document.body.textContent).not.toContain('Listas para');
        expect(document.body.textContent).not.toContain('Hoja horizontal');
        // La pregunta no depende de sí misma.
        expect(document.getElementById('depends-discapacidad_tiene-discapacidad_tiene')).toBeNull();

        const rename = document.getElementById('edit-part-label-formacion_experiencia') as HTMLInputElement;
        rename.value = 'Formación académica y experiencia';
        rename.dispatchEvent(new Event('input'));
        (document.getElementById('depends-discapacidad_tiene-discapacidad_tipo') as HTMLButtonElement).click();
        await flushPromises();
        (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await flushPromises();

        const body = JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body));
        const byKey = Object.fromEntries(body.properties.map((item: { key: string }) => [item.key, item]));
        expect(byKey.formacion_experiencia).toMatchObject({ label: 'Formación académica y experiencia', show_when: null });
        expect(byKey.discapacidad_tipo).toMatchObject({ label: 'Tipo de discapacidad', show_when: { key: 'discapacidad_tiene', value: 'Sí' } });
        expect(byKey.discapacidad_tiene).toMatchObject({ label: 'Estudiantes con discapacidad', show_when: null });
        expect(body.title).toBe('Identificación institucional');
    });
});
