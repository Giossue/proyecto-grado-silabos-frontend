import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateDraftPayload, TemplatePayload } from '@/api/template';
import TemplateSelectionTools from '@/components/domain/configuration/TemplateSelectionTools.vue';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { typeConfirmation } from '@/test/confirmPhrase';
import type { DocumentNode } from '@/lib/templateDocument';

vi.mock('@/api/template');

type Template = NonNullable<TemplatePayload['template']>;
const plain: DocumentNode = { type: 'doc', content: [{ type: 'paragraph' }] };
const fixed: DocumentNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto fijo' }] }] };
const template = (limit?: number): Template => ({
    id: 't1', name: 'Plantilla', description: null, titleBlock: { text: 'SÍLABO' },
    sections: [{ id: 's1', key: 'uno', title: 'Uno', orientation: 'portrait', fields: [
        { id: 'f1', key: 'descripcion', label: 'Descripción', quien_llena: 'carrera', content: plain, ...(limit ? { max_length: limit } : {}) },
        { id: 'f2', key: 'etica', label: 'Ética', quien_llena: 'institucional', content: fixed },
    ] }],
});

const body = () => document.body;
const click = async (el: Element | undefined | null) => { expect(el).toBeTruthy(); (el as HTMLElement).click(); await flushPromises(); };
const byText = (selector: string, value: string) => [...body().querySelectorAll<HTMLElement>(selector)].find((el) => el.textContent?.trim() === value);
const mountBuilder = async (value: Template) => {
    const wrapper = mount(TemplateVisualBuilder, { props: { template: value }, attachTo: document.body });
    (wrapper.vm as unknown as { askEdit: () => void }).askEdit();
    await flushPromises();
    typeConfirmation('template-edit-confirm', 'editar plantilla');
    await flushPromises();
    await click(byText('button', 'Continuar'));
    return wrapper;
};
const selectField = async (id: string) => {
    body().querySelector(`[data-field-editor="${id}"]`)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await flushPromises();
};
const payload = (wrapper: ReturnType<typeof mount>) => (wrapper.vm as unknown as { payload: () => TemplateDraftPayload }).payload();
const tool = () => body().querySelector<HTMLButtonElement>('[data-field-limit-tool]')!;
const type = async (value: string) => {
    const input = body().querySelector<HTMLInputElement>('[data-field-limit-input]')!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
};

describe('Límite de caracteres en el editor de la plantilla', () => {
    enableAutoUnmount(afterEach);
    beforeAll(() => { Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => undefined, scrollIntoView: () => undefined }); });
    beforeEach(() => {
        vi.resetAllMocks();
        document.body.innerHTML = '';
    });

    it('con un campo editable elegido, «Límite de caracteres» pone el límite y lo muestra bajo el campo', async () => {
        const wrapper = await mountBuilder(template());
        expect(tool().disabled).toBe(true);
        await selectField('f1');
        expect(tool().disabled).toBe(false);
        await click(tool());
        for (const wrong of ['', '0', '50001', 'cien']) {
            await type(wrong);
            await click(body().querySelector('[data-field-limit-apply]'));
            expect(body().querySelector('[data-field-limit-error]')!.textContent).toContain('Escriba un número entre 1 y 50 000');
        }
        expect(payload(wrapper).sections[0]!.fields[0]).not.toHaveProperty('max_length');
        await type('500');
        await click(body().querySelector('[data-field-limit-apply]'));

        expect(payload(wrapper).sections[0]!.fields[0]!.max_length).toBe(500);
        expect(body().querySelector('[data-field-limit="f1"]')!.textContent).toBe('Hasta 500 caracteres');
    });

    it('«Quitar límite» lo quita y un campo no editable no admite límite', async () => {
        const wrapper = await mountBuilder(template(800));
        expect(body().querySelector('[data-field-limit="f1"]')!.textContent).toBe('Hasta 800 caracteres');
        await selectField('f2');
        expect(tool().disabled).toBe(true);

        await selectField('f1');
        await click(tool());
        expect(body().querySelector<HTMLInputElement>('[data-field-limit-input]')!.value).toBe('800');
        await click(body().querySelector('[data-field-limit-remove]'));

        expect(payload(wrapper).sections[0]!.fields[0]).not.toHaveProperty('max_length');
        expect(body().querySelector('[data-field-limit="f1"]')).toBeNull();
        expect(payload(wrapper).sections[0]!.fields[1]).not.toHaveProperty('max_length');
    });

    it('al volver No editable un campo con límite cambia quién lo llena y se le quita el límite', async () => {
        const wrapper = await mountBuilder(template(800));
        await selectField('f1');
        wrapper.findComponent(TemplateSelectionTools).vm.$emit('responsible', 'institucional');
        await flushPromises();

        expect(payload(wrapper).sections[0]!.fields[0]!.quien_llena).toBe('institucional');
        expect(payload(wrapper).sections[0]!.fields[0]).not.toHaveProperty('max_length');
        expect(body().querySelector('[data-field-limit="f1"]')).toBeNull();

        wrapper.findComponent(TemplateSelectionTools).vm.$emit('responsible', 'carrera');
        await flushPromises();
        expect(payload(wrapper).sections[0]!.fields[0]!.quien_llena).toBe('carrera');
    });
});
