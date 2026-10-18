import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { updateAcademicRecord } from '@/api/academic';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';

vi.mock('@/api/academic', () => ({ updateAcademicRecord: vi.fn() }));

afterEach(() => { document.body.innerHTML = ''; vi.clearAllMocks(); });

const mountSheet = () => mount(CatalogEditSheet, {
  attachTo: document.body,
  props: {
    entity: 'facultad', recordId: 'faculty-1', recordName: 'Facultad de Ciencias', campus: 'matriz',
    faculties: [], campusOptions: [{ value: 'matriz', label: 'Campus Matriz' }], modalityOptions: [],
    logoUrl: 'https://api.example.test/logos/faculty-1.png', showTrigger: false, open: true,
  },
});
const button = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.getAttribute('aria-label') === label || item.textContent?.trim() === label);

describe('CatalogEditSheet · logo de la facultad', () => {
  it('con logo muestra la imagen con una X y no la zona de arrastre; al quitarlo aparece la zona', async () => {
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Arrastra tu PNG aquí');

    button('Quitar logo')!.click();
    await flushPromises();
    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).toBeNull();
    expect(document.body.textContent).toContain('Arrastra tu PNG aquí');
    wrapper.unmount();
  });

  it('quitar el logo deja el campo opcional, y cancelar vuelve a mostrar el logo', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    button('Quitar logo')!.click();
    await flushPromises();

    expect(document.body.querySelector<HTMLInputElement>('#edit-faculty-logo-faculty-1')?.required).toBe(false);

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });
    await flushPromises();
    expect(document.body.querySelector('img[alt="Logo actual de la facultad"]')).not.toBeNull();
    expect(document.body.textContent).not.toContain('Arrastra tu PNG aquí');
    wrapper.unmount();
  });
});
