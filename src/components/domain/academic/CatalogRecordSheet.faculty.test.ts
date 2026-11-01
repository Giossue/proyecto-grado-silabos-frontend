import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAcademicRecord } from '@/api/academic';
import { getCatalogLibraries } from '@/api/libraryCatalog';
import CatalogRecordSheet from '@/components/domain/academic/CatalogRecordSheet.vue';
import FileDropzone from '@/components/domain/FileDropzone.vue';

vi.mock('@/api/academic', () => ({ createAcademicRecord: vi.fn() }));
vi.mock('@/api/libraryCatalog', () => ({ getCatalogLibraries: vi.fn() }));

const campus = 'Campus Matriz Dr. Gabriel Galarza López';
const options = { faculties: [], campusOptions: [{ value: campus, label: campus }], modalityOptions: [] } as never;
const body = (): HTMLElement => document.body;
const button = (label: string): HTMLButtonElement | undefined => Array.from(body().querySelectorAll('button')).find((item) => item.textContent?.trim() === label);
const row = (name: string): HTMLElement => Array.from(body().querySelectorAll<HTMLElement>('[data-slot="field"]')).find((item) => item.textContent?.trim() === name)!;
const isChecked = (name: string): boolean => row(name).querySelector('[role="checkbox"]')!.getAttribute('aria-checked') === 'true';

const firstStep = async () => {
    const wrapper = mount(CatalogRecordSheet, { attachTo: document.body, props: { entity: 'facultad', options, open: false } });
    await wrapper.setProps({ open: true });
    await flushPromises();
    const state = (wrapper.vm as unknown as { $: { setupState: { form: { nombre: string; campus: string } } } }).$.setupState;
    state.form.nombre = 'Facultad de Salud';
    state.form.campus = campus;
    wrapper.findComponent(FileDropzone).vm.$emit('update:modelValue', new File(['x'], 'logo.png', { type: 'image/png' }));
    await flushPromises();

    return wrapper;
};
const next = async (): Promise<void> => { button('Siguiente')!.click(); await flushPromises(); };
const sent = (): FormData => vi.mocked(createAcademicRecord).mock.calls[0]![1] as FormData;

describe('Nueva facultad · paso de bibliotecas', () => {
    beforeEach(() => {
        vi.mocked(getCatalogLibraries).mockResolvedValue([{ id: 'BFCCA', name: 'LAGUACOTO' }, { id: 'BGEN', name: 'MATRIZ' }, { id: 'BHTM', name: 'SAN MIGUEL' }]);
        vi.mocked(createAcademicRecord).mockResolvedValue({ message: 'Facultad creada.' });
    });
    afterEach(() => { body().innerHTML = ''; vi.clearAllMocks(); });

    it('el primer paso pide los datos y ofrece Siguiente; las bibliotecas van en el segundo', async () => {
        const wrapper = await firstStep();

        expect(body().querySelector('#catalog-name')).not.toBeNull();
        expect(button('Siguiente')).toBeDefined();
        expect(button('Crear facultad')).toBeUndefined();
        expect(body().textContent).not.toContain('Bibliotecas disponibles');

        await next();
        expect(body().textContent).toContain('Bibliotecas disponibles');
        expect(body().querySelector('#catalog-name')).toBeNull();
        expect(button('Atrás')).toBeDefined();
        expect(button('Crear facultad')).toBeDefined();
        expect(button('Siguiente')).toBeUndefined();
        expect(['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL'].map(isChecked)).toEqual([true, true, true]);
        expect(createAcademicRecord).not.toHaveBeenCalled();
        wrapper.unmount();
    });

    it('sin los datos obligatorios no pasa al segundo paso', async () => {
        const wrapper = mount(CatalogRecordSheet, { attachTo: document.body, props: { entity: 'facultad', options, open: false } });
        await wrapper.setProps({ open: true });
        await flushPromises();
        await next();

        expect(body().querySelector('#catalog-name')).not.toBeNull();
        expect(body().textContent).not.toContain('Bibliotecas disponibles');
        expect(createAcademicRecord).not.toHaveBeenCalled();
        wrapper.unmount();
    });

    it('Atrás vuelve a los datos sin perder lo escrito', async () => {
        const wrapper = await firstStep();
        await next();

        button('Atrás')!.click();
        await flushPromises();

        expect(body().querySelector<HTMLInputElement>('#catalog-name')!.value).toBe('Facultad de Salud');
        wrapper.unmount();
    });

    it('con todas las bibliotecas marcadas crea la facultad sin lista, o sea «todas»', async () => {
        const wrapper = await firstStep();
        await next();
        button('Crear facultad')!.click();
        await flushPromises();

        expect(sent().get('catalog_libraries')).toBeNull();
        expect(sent().get('nombre')).toBe('Facultad de Salud');
        expect(wrapper.emitted('saved')).toEqual([['Facultad creada.']]);
        wrapper.unmount();
    });

    it('desmarcar bibliotecas crea la facultad solo con las que quedan', async () => {
        const wrapper = await firstStep();
        await next();
        row('LAGUACOTO').querySelector<HTMLElement>('[role="checkbox"]')!.click();
        await flushPromises();
        button('Crear facultad')!.click();
        await flushPromises();

        expect(sent().get('catalog_libraries')).toBe('["BGEN","BHTM"]');
        wrapper.unmount();
    });

    it('sin ninguna marcada no deja crear', async () => {
        const wrapper = await firstStep();
        await next();
        for (const name of ['LAGUACOTO', 'MATRIZ', 'SAN MIGUEL']) {
            row(name).querySelector<HTMLElement>('[role="checkbox"]')!.click();
            await flushPromises();
        }
        button('Crear facultad')!.click();
        await flushPromises();

        expect(createAcademicRecord).not.toHaveBeenCalled();
        expect(body().textContent).toContain('Marque al menos una biblioteca');
        wrapper.unmount();
    });

    it('las carreras se crean en un solo paso', async () => {
        const wrapper = mount(CatalogRecordSheet, { attachTo: document.body, props: { entity: 'carrera', options, open: false } });
        await wrapper.setProps({ open: true });
        await flushPromises();

        expect(button('Siguiente')).toBeUndefined();
        expect(button('Crear carrera')).toBeDefined();
        expect(getCatalogLibraries).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
