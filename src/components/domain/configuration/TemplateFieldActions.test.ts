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
    id: `field-${key}`, block_id: 'block-1', key, label, help: null, type: 'texto_libre',
    options: [], required: true, inherited: false, master_source: null, teacher_editable: true,
    content_type: 'text', ...extra,
});
const document = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'metodologia', label: 'Metodología', kind: 'texto_libre' } }] }] };
const block = (extra: Partial<TemplateFieldContainer> = {}): TemplateFieldContainer => ({
    id: 'block-1', key: 'bloque', title: 'Metodología', type: 'narrativa',
    content_type: 'text', document, fingerprint: 'a'.repeat(64), fields: [part('metodologia', 'Metodología')], ...extra,
});

const mountActions = (field: TemplateFieldContainer) => mount({
    components: { TemplateFieldActions, TooltipProvider },
    setup: () => ({ field }),
    template: '<TooltipProvider><TemplateFieldActions ref="actions" template-id="template-1" section-title="Metodología" :field="field" /></TooltipProvider>',
}, { attachTo: window.document.body });
const open = async (wrapper: ReturnType<typeof mountActions>) => {
    (wrapper.vm.$refs.actions as { openEdit: () => void }).openEdit();
    await flushPromises();
};
const submit = async () => {
    (window.document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
};

describe('TemplateFieldActions', () => {
    afterEach(() => {
        window.document.body.innerHTML = '';
        vi.mocked(api).mockClear();
    });

    it('Propiedades solo pide el nombre y la hoja horizontal (I-158)', async () => {
        const wrapper = mountActions(block());
        await open(wrapper);

        const text = window.document.body.textContent ?? '';
        expect(text).toContain('Nombre (opcional)');
        expect(text).toContain('Hoja horizontal');
        expect(text).not.toContain('Preguntas que llena el docente');
        expect(text).not.toContain('dependen de una respuesta');
        expect(text).not.toContain('Forma:');
        expect(text).toContain('Se llena desde la ficha de la asignatura');
        expect(text).not.toContain('El docente puede ajustarlo');
        expect(window.document.querySelectorAll('input:not([type="hidden"]), button[role="checkbox"]')).toHaveLength(3);
    });

    it('marcar «desde la ficha» guarda el origen del campo después de la hoja', async () => {
        const wrapper = mountActions(block());
        await open(wrapper);
        (window.document.getElementById('edit-template-field-profile') as HTMLButtonElement).click();
        await flushPromises();
        expect(window.document.body.textContent).toContain('El docente puede ajustarlo');
        (window.document.getElementById('edit-template-field-adjust') as HTMLButtonElement).click();
        await flushPromises();
        await submit();

        const [url, init] = vi.mocked(api).mock.calls[1]!;
        expect(url).toBe('/admin/template/template-1/fields/field-metodologia');
        expect(JSON.parse(String(init!.body))).toMatchObject({
            block_id: 'block-1', key: 'metodologia', content_type: 'text', from_profile: true, teacher_editable: true,
        });
    });

    it('un dato automático de la malla no ofrece la ficha', async () => {
        const wrapper = mountActions(block({ fields: [part('asignatura', 'Asignatura', { master_source: 'asignaturas', inherited: true, teacher_editable: false })] }));
        await open(wrapper);

        expect(window.document.body.textContent).not.toContain('Se llena desde la ficha');
    });

    it('guarda nombre y orientación junto con la hoja del campo', async () => {
        const wrapper = mountActions(block());
        await open(wrapper);
        const input = window.document.getElementById('edit-template-field-label') as HTMLInputElement;
        input.value = 'Metodología activa';
        input.dispatchEvent(new Event('input'));
        (window.document.getElementById('edit-template-field-landscape') as HTMLButtonElement).click();
        await flushPromises();
        await submit();

        const [url, init] = vi.mocked(api).mock.calls[0]!;
        expect(url).toBe('/admin/template/template-1/blocks/block-1/document');
        expect(JSON.parse(String(init!.body))).toEqual({
            page_orientation: 'landscape', document, fingerprint: 'a'.repeat(64), title: 'Metodología activa',
        });
    });

    it('un campo anterior sin hoja guarda nombre y orientación en su pregunta', async () => {
        const wrapper = mountActions(block({ document: null, content_type: 'multiple_choice', fields: [part('habilidades', 'Habilidades', { type: 'seleccion_multiple' })] }));
        await open(wrapper);
        await submit();

        const [url, init] = vi.mocked(api).mock.calls[0]!;
        expect(url).toBe('/admin/template/template-1/fields/field-habilidades');
        expect(JSON.parse(String(init!.body))).toMatchObject({ block_id: 'block-1', key: 'habilidades', content_type: 'multiple_choice', page_orientation: 'portrait' });
    });
});
