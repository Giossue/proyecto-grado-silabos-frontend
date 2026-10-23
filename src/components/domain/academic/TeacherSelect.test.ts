import { flushPromises, mount } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import TeacherSelect from '@/components/domain/academic/TeacherSelect.vue';

const teachers = [
  { id: 'teacher-1', name: 'MARÍA PÉREZ' },
  { id: 'teacher-2', name: 'EDUARDO NARVÁEZ' },
];
const trigger = () => document.body.querySelector<HTMLButtonElement>('button[role="combobox"]')!;
const search = () => document.body.querySelector<HTMLInputElement>('input[aria-label="Buscar docente por nombre"]')!;
const options = () => [...document.body.querySelectorAll<HTMLElement>('[data-slot="command-item"]')];
const filter = async (query: string) => {
  search().value = query;
  search().dispatchEvent(new Event('input', { bubbles: true }));
  await flushPromises();
};
const mountSelect = (modelValue = '') => mount(TeacherSelect, {
  attachTo: document.body,
  props: { teachers, label: 'Docente del nuevo paralelo', modelValue },
});

const scrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Element.prototype.scrollIntoView = scrollIntoView; });

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TeacherSelect', () => {
  it('filtra nombres sin distinguir mayúsculas ni tildes y selecciona por identificador', async () => {
    const wrapper = mountSelect();
    trigger().click();
    await flushPromises();

    expect(options().map((option) => option.textContent?.trim())).toEqual(['MARÍA PÉREZ', 'EDUARDO NARVÁEZ']);
    await filter('maria perez');
    expect(options().map((option) => option.textContent?.trim())).toEqual(['MARÍA PÉREZ']);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();

    options()[0]!.click();
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toEqual([['teacher-1']]);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(search()).toBeNull();
    wrapper.unmount();
  });

  it('informa cuando no hay resultados y permite limpiar la búsqueda sin cambiar el docente', async () => {
    const wrapper = mountSelect('teacher-2');
    expect(trigger().textContent).toContain('EDUARDO NARVÁEZ');
    trigger().click();
    await flushPromises();
    await filter('inexistente');

    expect(options()).toHaveLength(0);
    expect(document.body.querySelector('[role="status"]')?.textContent).toContain('No se encontraron docentes.');
    await filter('');
    expect(options()).toHaveLength(2);
    expect(document.body.querySelector('[role="status"]')).toBeNull();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    wrapper.unmount();
  });

  it('marca la elección obligatoria y no ofrece Sin docente entre las opciones', async () => {
    const wrapper = mountSelect();
    await wrapper.setProps({ required: true, invalid: true });
    expect(trigger().textContent).toContain('Elija el docente');
    expect(trigger().getAttribute('aria-required')).toBe('true');
    expect(trigger().getAttribute('aria-invalid')).toBe('true');
    trigger().click();
    await flushPromises();

    expect(options().map((option) => option.textContent?.trim())).not.toContain('Sin docente');
    wrapper.unmount();
  });

  it('permite buscar y confirmar un docente con el teclado', async () => {
    const wrapper = mountSelect();
    trigger().click();
    await flushPromises();
    await vi.waitFor(() => expect(document.activeElement).toBe(search()));
    await filter('eduardo');
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    await flushPromises();
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flushPromises();

    expect(wrapper.emitted('update:modelValue')).toEqual([['teacher-2']]);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger()));
    wrapper.unmount();
  });

  it('cierra con Escape sin cambiar la selección y limpia el buscador al reabrir', async () => {
    const wrapper = mountSelect('teacher-2');
    trigger().click();
    await flushPromises();
    await filter('maria');
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await flushPromises();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    trigger().click();
    await flushPromises();
    expect(search().value).toBe('');
    expect(options()).toHaveLength(2);
    wrapper.unmount();
  });
});
