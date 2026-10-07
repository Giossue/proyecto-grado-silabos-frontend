import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/client';
import TemplateBlockCreator from '@/components/domain/configuration/TemplateBlockCreator.vue';

vi.mock('@/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/client')>()),
    api: vi.fn().mockResolvedValue({}),
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });

const mountCreator = (presets = [{ key: 'descripcion', title: 'Descripción de la asignatura', summary: 'Texto que Coordinación escribe una vez.' }]) => mount(TemplateBlockCreator, {
    props: { templateId: 'template-1', position: 0, blockTypes: [{ value: 'free_text', label: 'Texto libre' }], presets, empty: true },
    global: { stubs: { Dialog: passthrough, DialogTrigger: passthrough, DialogContent: passthrough, DialogHeader: passthrough, DialogFooter: passthrough, DialogTitle: passthrough, DialogDescription: passthrough } },
});

describe('TemplateBlockCreator — plantillas de campo en la sección nueva', () => {
    afterEach(() => vi.mocked(api).mockClear());

    it('ofrece las plantillas del catálogo solo si existen', () => {
        expect(mountCreator().text()).toContain('Usar un diseño oficial');
        expect(mountCreator([]).text()).not.toContain('Usar un diseño oficial');
    });

    it('primero pregunta cómo empezar; elegir un diseño pasa al nombre', async () => {
        const wrapper = mountCreator();
        expect(wrapper.text()).toContain('Empezar en blanco');
        expect(wrapper.text()).not.toContain('Nombre de la sección');

        await wrapper.findAll('button').find((b) => b.text().includes('Usar un diseño oficial'))!.trigger('click');
        await wrapper.findAll('button').find((b) => b.text().includes('Descripción de la asignatura'))!.trigger('click');

        expect(wrapper.text()).toContain('Nombre de la sección');
        expect((wrapper.get('#new-template-block-title').element as HTMLInputElement).value).toBe('Descripción de la asignatura');
        expect(wrapper.text()).not.toContain('Campo 1');
    });

    it('al elegir una plantilla envía su clave, sin campos, y completa el nombre', async () => {
        const wrapper = mountCreator();
        (wrapper.vm as unknown as { form: { preset: string; title: string } }).form.preset = 'descripcion';
        (wrapper.vm as unknown as { form: { title: string } }).form.title = 'Descripción de la asignatura';
        await flushPromises();

        expect(wrapper.text()).not.toContain('Campo 1');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        const [url, init] = vi.mocked(api).mock.calls[0]!;
        expect(url).toBe('/admin/template/template-1/sections');
        const body = JSON.parse(String(init!.body));
        expect(body).toMatchObject({ title: 'Descripción de la asignatura', preset: 'descripcion' });
        expect(body).not.toHaveProperty('fields');
    });
});
