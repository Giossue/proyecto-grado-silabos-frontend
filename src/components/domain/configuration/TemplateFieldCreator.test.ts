import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import TemplateFieldCreator from '@/components/domain/configuration/TemplateFieldCreator.vue';

vi.mock('@/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/client')>()),
    api: vi.fn().mockResolvedValue({}),
}));

const sheet = defineComponent({ template: '<div><slot name="default" :close="() => undefined" /></div>' });
const actions = defineComponent({ template: '<button type="submit">Agregar campo</button>' });

const mountCreator = (presets = [{ key: 'distribucion', title: 'Distribución y planificación (16 semanas)', summary: 'Tabla de 16 semanas.' }]) => mount(TemplateFieldCreator, {
    props: { templateId: 'template-1', sectionId: 'section-1', position: 2, blockTypes: [{ value: 'free_text', label: 'Texto libre' }], presets },
    global: { stubs: { FormSheet: sheet, FormSheetActions: actions } },
});

describe('TemplateFieldCreator — plantillas de campo (I-190)', () => {
    afterEach(() => vi.mocked(api).mockClear());

    it('ofrece las plantillas del catálogo y las explica', () => {
        const wrapper = mountCreator();

        expect(wrapper.text()).toContain('Plantilla');
        expect(wrapper.text()).toContain('Elija un diseño oficial ya armado');
        expect(mountCreator([]).text()).not.toContain('Plantilla');
    });

    it('al elegir una plantilla envía su clave y oculta la forma del campo', async () => {
        const wrapper = mountCreator();
        (wrapper.vm as unknown as { form: { preset: string } }).form.preset = 'distribucion';
        await flushPromises();

        expect(wrapper.text()).toContain('Tabla de 16 semanas.');
        expect(wrapper.text()).not.toContain('¿Qué forma tiene?');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        const [url, init] = vi.mocked(api).mock.calls[0]!;
        expect(url).toBe('/admin/template/template-1/fields');
        expect(JSON.parse(String(init!.body))).toMatchObject({ section_id: 'section-1', position: 3, preset: 'distribucion' });
    });

    it('sin plantilla no manda el campo preset', async () => {
        const wrapper = mountCreator();
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        const [, init] = vi.mocked(api).mock.calls[0]!;
        expect(JSON.parse(String(init!.body))).not.toHaveProperty('preset');
    });
});
