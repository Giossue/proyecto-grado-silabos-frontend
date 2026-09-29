import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '@/api/client';
import TemplateTableProjectDataDialog from '@/components/domain/configuration/template-table/TemplateTableProjectDataDialog.vue';

vi.mock('@/api/client', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/api/client')>()),
    api: vi.fn(),
}));

const variable = { key: 'curricular_resultados_de_aprendizaje', label: 'Resultados de aprendizaje', sample: 'Resultados de aprendizaje', type: 'lista', scope: 'asignatura' };

const mountDialog = () => mount(TemplateTableProjectDataDialog, {
    props: { templateId: 'plantilla-1', sectionTitle: 'Resultados de aprendizaje' },
    attachTo: document.body,
});

const submit = async () => {
    (document.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flushPromises();
};

describe('TemplateTableProjectDataDialog', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        vi.mocked(api).mockReset();
    });

    it('propone el nombre de la sección y entrega el @ProyectoCarrera creado', async () => {
        vi.mocked(api).mockResolvedValue({ message: 'ok', variable });
        const wrapper = mountDialog();
        (wrapper.vm as unknown as { open: () => void }).open();
        await flushPromises();

        expect((document.getElementById('project-data-label') as HTMLInputElement).value).toBe('Resultados de aprendizaje');
        await submit();

        expect(vi.mocked(api)).toHaveBeenCalledWith('/admin/template/plantilla-1/project-data', expect.objectContaining({ method: 'POST' }));
        expect(JSON.parse(String(vi.mocked(api).mock.calls[0]![1]!.body))).toEqual({ label: 'Resultados de aprendizaje', type: 'lista', scope: 'asignatura' });
        expect(wrapper.emitted('create')).toEqual([[variable]]);
    });

    it('muestra el motivo cuando el nombre ya existe con otra forma', async () => {
        vi.mocked(api).mockRejectedValue(new ApiError('Datos inválidos', 422, { label: ['Ya existe «Resultados de aprendizaje» con otra forma.'] }));
        const wrapper = mountDialog();
        (wrapper.vm as unknown as { open: () => void }).open();
        await flushPromises();
        await submit();

        expect(document.body.textContent).toContain('Ya existe «Resultados de aprendizaje» con otra forma.');
        expect(wrapper.emitted('create')).toBeUndefined();
    });
});
