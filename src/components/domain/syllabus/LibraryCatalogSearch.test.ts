import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { searchLibraryCatalog, type CatalogBook } from '@/api/libraryCatalog';
import LibraryCatalogSearch from '@/components/domain/syllabus/LibraryCatalogSearch.vue';
import { catalogResults } from '@/test/libraryCatalog';

vi.mock('@/api/libraryCatalog');
const search = vi.mocked(searchLibraryCatalog);

const book: CatalogBook = { id: '10525', title: 'Proyectos de inversión', author: 'Sapag Chain, Nassir', year: '2011', place: 'Santiago de Chile', publisher: 'Pearson Educación', isbn: '9789563431063', call_number: '658.404 S2411p', format: 'Libro físico', kind: 'Libro' };
const passthrough = defineComponent({ template: '<div><slot /></div>' });
// Como reka-ui: el contenido sigue montado mientras se desvanece.
const fadingDialog = defineComponent({
    props: { open: Boolean },
    emits: ['update:open'],
    template: '<div data-modal :data-state="open ? \'open\' : \'closed\'"><slot /></div>',
});
const dialogStubs = { Dialog: fadingDialog, DialogContent: passthrough, DialogHeader: passthrough, DialogTitle: passthrough, DialogDescription: passthrough, DialogFooter: passthrough, DialogClose: passthrough, DialogTrigger: passthrough };
const wrappers: Array<ReturnType<typeof mount>> = [];
const body = (): HTMLElement => document.body;
const buttonWith = (text: string): HTMLButtonElement => [...body().querySelectorAll('button')].find((item) => item.textContent?.includes(text)) as HTMLButtonElement;
const open = async (disabled = false) => {
    const wrapper = mount(LibraryCatalogSearch, { props: { disabled }, attachTo: document.body });
    wrappers.push(wrapper);
    buttonWith('Buscar en la biblioteca').click();
    await flushPromises();

    return wrapper;
};
const searchFor = async (text: string): Promise<void> => {
    const input = body().querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    body().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await flushPromises();
};

describe('búsqueda en la biblioteca', () => {
    beforeEach(() => search.mockReset());
    afterEach(() => { try { wrappers.splice(0).forEach((wrapper) => wrapper.unmount()); } catch (e) { console.log('UNMOUNT-ERR>>', (e as Error).stack); } document.body.innerHTML = ''; });

    it('busca por el campo elegido y entrega el libro que se agrega', async () => {
        search.mockResolvedValue(catalogResults([book]));
        const wrapper = await open();
        const select = body().querySelector<HTMLSelectElement>('[aria-label="Buscar por"]')!;
        select.value = 'author';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await flushPromises();

        await searchFor('Sapag');

        expect(search).toHaveBeenCalledWith('author', 'Sapag', 1);
        expect(body().textContent).toContain('Proyectos de inversión');
        expect([...body().querySelectorAll('th')].map((item) => item.textContent?.trim())).toEqual(['Autor', 'Título', 'Tipo', 'Año', 'Ciudad', 'Editorial', 'ISBN', 'Código', 'Agregar']);
        expect([...body().querySelectorAll('tbody td')].map((item) => item.textContent?.trim()).slice(0, 8)).toEqual(['Sapag Chain, Nassir', 'Proyectos de inversión', 'Libro', '2011', 'Santiago de Chile', 'Pearson Educación', '9789563431063', 'Libro físico']);
        buttonWith('Agregar').click();
        await flushPromises();
        expect(wrapper.emitted('pick')).toEqual([[book]]);
        expect(buttonWith('Agregado').disabled).toBe(true);
    });

    it('avisa cuando no hay resultados', async () => {
        search.mockResolvedValue(catalogResults([]));
        await open();

        await searchFor('nada');

        expect(body().querySelector('tbody')!.textContent).toContain('No hay resultados');
    });

    it('no busca con menos de dos letras', async () => {
        await open();

        await searchFor('a');

        expect(search).not.toHaveBeenCalled();
        expect(body().querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    });

    it('el botón se deshabilita cuando ya no caben más libros', async () => {
        const wrapper = mount(LibraryCatalogSearch, { props: { disabled: true }, attachTo: document.body });
        wrappers.push(wrapper);

        expect(buttonWith('Buscar en la biblioteca').disabled).toBe(true);
    });

    it('se cierra con el botón Cerrar y la próxima vez abre limpio', async () => {
        search.mockResolvedValue(catalogResults([book]));
        await open();
        await searchFor('Sapag');
        expect(body().textContent).toContain('Proyectos de inversión');

        buttonWith('Cerrar').click();
        await flushPromises();
        expect(buttonWith('Cerrar')).toBeUndefined();

        buttonWith('Buscar en la biblioteca').click();
        await flushPromises();
        expect(body().querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!.value).toBe('');
        expect(body().querySelector('table')).toBeNull();
    });

    describe('páginas', () => {
        const pageButton = (label: string): HTMLButtonElement => body().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

        it('con más de 20 libros muestra la paginación y pide la página elegida con la misma búsqueda', async () => {
            search.mockResolvedValue(catalogResults(Array.from({ length: 20 }, (_, index) => ({ ...book, id: String(index) })), 45));
            await open();
            await searchFor('Sapag');
            expect(body().textContent).toContain('1–20 de 45');

            search.mockResolvedValue(catalogResults([{ ...book, id: '99', title: 'Libro de la página 3' }], 45, 3));
            pageButton('Ir a la página 3').click();
            await flushPromises();

            expect(search).toHaveBeenLastCalledWith('any', 'Sapag', 3);
            expect(body().textContent).toContain('Libro de la página 3');
            expect(body().textContent).toContain('41–41 de 45');
        });

        it('sigue con la búsqueda que se hizo aunque se cambie el texto sin buscar', async () => {
            search.mockResolvedValue(catalogResults(Array.from({ length: 20 }, (_, index) => ({ ...book, id: String(index) })), 45));
            await open();
            await searchFor('Sapag');
            const input = body().querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!;
            input.value = 'otra cosa';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await flushPromises();

            pageButton('Ir a la página 2').click();
            await flushPromises();

            expect(search).toHaveBeenLastCalledWith('any', 'Sapag', 2);
        });

        it('una búsqueda nueva vuelve a la página 1 y sin resultados la paginación dice 0–0 de 0', async () => {
            search.mockResolvedValue(catalogResults(Array.from({ length: 20 }, (_, index) => ({ ...book, id: String(index) })), 45));
            await open();
            await searchFor('Sapag');
            search.mockResolvedValue(catalogResults([]));

            await searchFor('nada');

            expect(search).toHaveBeenLastCalledWith('any', 'nada', 1);
            expect(body().querySelector('[aria-label="Paginación de los libros"]')).not.toBeNull();
            expect(body().textContent).toContain('0–0 de 0');
        });
    });

    it('al cerrar conserva la búsqueda mientras se desvanece y la limpia al volver a abrir', async () => {
        search.mockResolvedValue(catalogResults([book]));
        const wrapper = mount(LibraryCatalogSearch, { attachTo: document.body, global: { stubs: dialogStubs } });
        wrappers.push(wrapper);
        const modal = wrapper.getComponent(fadingDialog);
        modal.vm.$emit('update:open', true);
        await flushPromises();
        await searchFor('Sapag');
        modal.vm.$emit('update:open', false);
        await flushPromises();

        expect(modal.attributes('data-state')).toBe('closed');
        expect(body().querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!.value).toBe('Sapag');
        expect(body().textContent).toContain('Proyectos de inversión');
        modal.vm.$emit('update:open', true);
        await flushPromises();
        expect(body().querySelector<HTMLInputElement>('[aria-label="Texto a buscar"]')!.value).toBe('');
        expect(body().textContent).not.toContain('Proyectos de inversión');
    });
});
