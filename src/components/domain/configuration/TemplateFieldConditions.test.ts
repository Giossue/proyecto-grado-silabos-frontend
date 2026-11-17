import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as templateApi from '@/api/template';
import type { TemplateDraftPayload, TemplatePayload } from '@/api/template';
import TemplateVisualBuilder from '@/components/domain/configuration/TemplateVisualBuilder.vue';
import { typeConfirmation } from '@/test/confirmPhrase';
import type { DocumentNode } from '@/lib/templateDocument';

vi.mock('@/api/template');

type Template = NonNullable<TemplatePayload['template']>;
const yesNo = [{ const: 'o1', title: 'Sí' }, { const: 'o2', title: 'No' }];
const question = (attrs: Record<string, unknown> = {}): DocumentNode => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '¿Usa laboratorio? ' }, { type: 'response', attrs: { kind: 'una', options: yesNo, value: null, ...attrs } as never }] }] });
const plain: DocumentNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Técnicas' }] }] };
const template = (first: DocumentNode, show?: { response: string; options: string[] }): Template => ({
    id: 't1', name: 'Plantilla', description: null, titleBlock: { text: 'SÍLABO' },
    sections: [{ id: 's1', key: 'uno', title: 'Uno', orientation: 'portrait', fields: [
        { id: 'f1', key: 'pregunta', label: 'Pregunta', quien_llena: 'carrera', content: first },
        { id: 'f2', key: 'tecnicas', label: 'Técnicas', quien_llena: 'carrera', content: plain, ...(show ? { show_if: show } : {}) },
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
const press = (element: Element | null, key = 'Enter') => { element!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); return flushPromises(); };

describe('Mostrar solo si en el editor de la plantilla', () => {
    enableAutoUnmount(afterEach);
    beforeAll(() => { Object.assign(Element.prototype, { hasPointerCapture: () => false, releasePointerCapture: () => undefined, scrollIntoView: () => undefined }); });
    beforeEach(() => {
        vi.resetAllMocks();
        document.body.innerHTML = '';
    });

    it('con un campo elegido, «Mostrar solo si…» lo condiciona a una respuesta anterior y le da identificador a esa respuesta', async () => {
        const wrapper = await mountBuilder(template(question()));
        expect(body().querySelector<HTMLButtonElement>('[data-field-condition-tool]')!.disabled).toBe(true);
        await selectField('f2');
        await click(body().querySelector('[data-field-condition-tool]'));
        await press(body().querySelector('[data-condition-source]'));
        expect([...body().querySelectorAll('[role="option"]')].map((item) => item.textContent?.trim())).toEqual(['Siempre', 'Usa laboratorio']);
        await press(body().querySelectorAll('[role="option"]')[1]!);
        expect(body().querySelector('[data-field-condition-error]')!.textContent).toContain('Elija al menos una opción');
        await click(body().querySelector('[data-condition-option="o1"]'));
        await click(body().querySelector('[data-field-condition-apply]'));

        const fields = payload(wrapper).sections[0]!.fields;
        const id = (fields[0]!.content.content![0]!.content![1]!.attrs as { id: string }).id;
        expect(id).toMatch(/^r_[a-z0-9]+$/);
        expect(fields[1]!.show_if).toEqual({ response: id, options: ['o1'] });
        expect(fields[0]).not.toHaveProperty('show_if');
        expect(body().querySelector('[data-field-condition="f2"]')!.textContent).toBe('Se muestra solo si «Usa laboratorio» es Sí');
    });

    it('el primer campo no tiene respuestas anteriores y una condición se quita con «Quitar condición»', async () => {
        const wrapper = await mountBuilder(template(question({ id: 'usa_lab' }), { response: 'usa_lab', options: ['o1'] }));
        await selectField('f1');
        await click(body().querySelector('[data-field-condition-tool]'));
        expect(body().textContent).toContain('Ponga antes una respuesta de elegir una o varias para usarla aquí');
        body().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await flushPromises();

        await selectField('f2');
        await click(body().querySelector('[data-field-condition-tool]'));
        await click(body().querySelector('[data-field-condition-remove]'));

        expect(payload(wrapper).sections[0]!.fields[1]).not.toHaveProperty('show_if');
        expect((payload(wrapper).sections[0]!.fields[0]!.content.content![0]!.content![1]!.attrs as { id: string }).id).toBe('usa_lab');
    });

    it('un campo duplicado recibe identificadores nuevos en sus respuestas', async () => {
        const wrapper = await mountBuilder(template(question({ id: 'usa_lab' })));
        await selectField('f1');
        await click(body().querySelector('button[aria-label="Duplicar el campo Pregunta"]'));

        const ids = payload(wrapper).sections[0]!.fields.map((field) => (field.content.content?.[0]?.content?.[1]?.attrs as { id?: string } | undefined)?.id);
        expect(ids[0]).toBe('usa_lab');
        expect(ids[1]).toMatch(/^r_[a-z0-9]+$/);
    });
});
