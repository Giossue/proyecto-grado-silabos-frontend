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
    content_type: 'text', table: null, document: null, fingerprint: 'a'.repeat(64), fields,
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
    template: '<TooltipProvider><TemplateFieldActions ref="actions" template-id="template-1" section-title="Datos" :section-id="sectionId" :field="field" :block-types="[]" :choice-fields="choiceFields" /></TooltipProvider>',
}, { attachTo: document.body });

describe('TemplateFieldActions', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.mocked(api).mockClear();
    });

    it('ofrece «Siempre» por defecto y guarda «Siempre» como sin condición', async () => {
        const wrapper = mountActions(block([part('discapacidad_tipo', 'Tipo de discapacidad')]));
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).toContain('Mostrar solo si');
        expect(document.getElementById('condition-part-discapacidad_tipo')?.textContent).toContain('Siempre');
        expect(document.getElementById('condition-value-discapacidad_tipo')).toBeNull();

        (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await flushPromises();
        const body = JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body));
        expect(body.show_when).toBeNull();
    });

    it('muestra y guarda la condición configurada', async () => {
        const wrapper = mountActions(block([part('discapacidad_tipo', 'Tipo de discapacidad', {
            show_when: { key: 'discapacidad_tiene', value: 'Sí' },
        })]));
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.getElementById('condition-part-discapacidad_tipo')?.textContent).toContain('Estudiantes con discapacidad');
        expect(document.getElementById('condition-value-discapacidad_tipo')?.textContent).toContain('Sí');

        (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
        await flushPromises();
        const body = JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body));
        expect(body.show_when).toEqual({ key: 'discapacidad_tiene', value: 'Sí' });
    });

    it('no ofrece preguntas de otra sección ni muestra condiciones sin opciones', async () => {
        const wrapper = mountActions(block([part('confirmacion', 'Confirmación', { type: 'booleano', content_type: 'boolean' })]), 'descripcion');
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).not.toContain('Cuándo se muestra');
        expect(document.getElementById('condition-part-confirmacion')).toBeNull();
        expect(document.body.textContent).not.toContain('Estudiantes con discapacidad');
    });

    it('en la ficha de identificación agrupa las condiciones y no ofrece listas curriculares', async () => {
        const identification = {
            ...block([
                part('discapacidad_tiene', 'Estudiantes con discapacidad', { type: 'seleccion_unica', content_type: 'multiple_choice' }),
                part('discapacidad_tipo', 'Tipo de discapacidad'),
            ]),
            content_type: 'institutional' as const,
            document: { type: 'doc', content: [] },
        };
        const wrapper = mountActions(identification);
        (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
        await flushPromises();

        expect(document.body.textContent).toContain('Cuándo se muestra');
        expect(document.body.textContent?.match(/Por defecto, siempre/g)).toHaveLength(1);
        expect(document.getElementById('condition-part-discapacidad_tipo')).not.toBeNull();
        expect(document.body.textContent).not.toContain('Listas para');
        expect(document.body.textContent).not.toContain('Hoja horizontal');
    });
});
