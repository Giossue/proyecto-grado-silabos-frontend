import { flushPromises, mount } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ParallelCreationSheet from '@/components/domain/academic/ParallelCreationSheet.vue';

const api = vi.hoisted(() => ({
  createParallels: vi.fn(),
  updateParallel: vi.fn(),
  deleteParallel: vi.fn(),
  createCareerRecord: vi.fn(),
  deleteCareerRecord: vi.fn(),
}));
vi.mock('@/api/career-academics', () => api);

const scrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Element.prototype.scrollIntoView = scrollIntoView; });

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

const mountSheet = () => mount(ParallelCreationSheet, {
  attachTo: document.body,
  props: {
    open: true,
    shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }], subjectId: 'subject-1',
    subjectLabel: 'SW-1 · Materia',
    teacherUsers: [{ id: 'teacher-1', name: 'DOCENTE UNO', email: 'docente@example.test' }],
    parallels: [
      { id: 'p-a', code: 'A', shift: 'matutina', editable: true, deletable: false },
      { id: 'p-b', code: 'B', shift: 'vespertina', editable: true, deletable: true },
    ],
  },
});
const button = (label: string) => document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

describe('ParallelCreationSheet', () => {
  it('propone la jornada matutina y la envía siempre al crear', async () => {
    api.createParallels.mockResolvedValue({ message: 'Creado' });
    const wrapper = mountSheet();
    await flushPromises();

    expect(document.body.textContent).not.toContain('Sin jornada');
    [...document.body.querySelectorAll('button')].find((item) => item.textContent?.includes('Agregar paralelo'))!.click();
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('#parallel-code-subject-1')!;
    input.value = 'C';
    input.dispatchEvent(new Event('input'));
    await flushPromises();
    button('Docente del nuevo paralelo')!.click();
    await flushPromises();
    expect([...document.body.querySelectorAll('[data-slot="command-item"]')].map((option) => option.textContent?.trim())).toEqual(['DOCENTE UNO']);
    document.body.querySelector<HTMLElement>('[data-slot="command-item"]')!.click();
    await flushPromises();
    button('Guardar nuevo paralelo')!.click();
    await flushPromises();

    expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 'subject-1', codes: ['C'], shift: 'matutina', user_id: 'teacher-1' });
    expect(api.createCareerRecord).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('no crea un paralelo con código y jornada completos si falta el docente', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    [...document.body.querySelectorAll('button')].find((item) => item.textContent?.includes('Agregar paralelo'))!.click();
    await flushPromises();
    const input = document.body.querySelector<HTMLInputElement>('#parallel-code-subject-1')!;
    input.value = 'C';
    input.dispatchEvent(new Event('input'));
    await flushPromises();
    expect(button('Docente del nuevo paralelo')?.textContent).toContain('Elija el docente');
    expect(button('Docente del nuevo paralelo')?.getAttribute('aria-required')).toBe('true');

    button('Guardar nuevo paralelo')!.click();
    await flushPromises();

    expect(api.createParallels).not.toHaveBeenCalled();
    expect(button('Docente del nuevo paralelo')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.body.textContent).toContain('Escriba el código y elija la jornada y el docente del paralelo.');
    wrapper.unmount();
  });

  it('edita en línea un paralelo registrado y solo ofrece eliminar el que no tiene actividad', async () => {
    api.updateParallel.mockResolvedValue({ message: 'Paralelo actualizado.' });
    const wrapper = mountSheet();
    await flushPromises();

    expect(button('Eliminar paralelo A')).toBeNull();
    expect(button('Eliminar paralelo B')).not.toBeNull();

    button('Editar paralelo B')!.click();
    await flushPromises();
    const code = document.body.querySelector<HTMLInputElement>('input[aria-label="Código del paralelo B"]')!;
    code.value = 'D';
    code.dispatchEvent(new Event('input'));
    await flushPromises();
    button('Guardar paralelo B')!.click();
    await flushPromises();

    expect(api.updateParallel).toHaveBeenCalledWith('p-b', { code: 'D', shift: 'vespertina' });
    expect(wrapper.emitted('changed')?.[0]).toEqual(['Paralelo actualizado.']);
    wrapper.unmount();
  });

  it('no guarda un paralelo sin código', async () => {
    const wrapper = mountSheet();
    await flushPromises();
    button('Editar paralelo A')!.click();
    await flushPromises();
    const code = document.body.querySelector<HTMLInputElement>('input[aria-label="Código del paralelo A"]')!;
    code.value = ' ';
    code.dispatchEvent(new Event('input'));
    await flushPromises();
    button('Guardar paralelo A')!.click();
    await flushPromises();

    expect(api.updateParallel).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Escriba el código y elija la jornada del paralelo.');
    wrapper.unmount();
  });

  it('busca al editar, conserva al docente actual fuera de la lista y guarda solo al confirmar', async () => {
    api.deleteCareerRecord.mockResolvedValue({ message: 'Retirado.' });
    api.createCareerRecord.mockResolvedValue({ message: 'Asignado.' });
    const wrapper = mountSheet();
    await wrapper.setProps({
      teacherUsers: [{ id: 'teacher-new', name: 'MARÍA PÉREZ', email: 'maria@example.test' }],
      assignments: [{ id: 'assignment-1', parallel_id: 'p-a', user_id: 'teacher-current', user_name: 'DOCENTE ACTUAL', active: true, editable: true }],
    });
    await flushPromises();
    button('Editar paralelo A')!.click();
    await flushPromises();
    button('Docente del paralelo A')!.click();
    await flushPromises();

    expect(document.body.textContent).toContain('DOCENTE ACTUAL');
    const search = document.body.querySelector<HTMLInputElement>('input[aria-label="Buscar docente por nombre"]')!;
    search.value = 'maria perez';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await flushPromises();
    const options = [...document.body.querySelectorAll<HTMLElement>('[data-slot="command-item"]')];
    expect(options).toHaveLength(1);
    options[0]!.click();
    await flushPromises();

    expect(button('Docente del paralelo A')?.textContent).toContain('MARÍA PÉREZ');
    expect(api.createCareerRecord).not.toHaveBeenCalled();
    expect(api.deleteCareerRecord).not.toHaveBeenCalled();
    button('Guardar paralelo A')!.click();
    await flushPromises();

    expect(api.deleteCareerRecord).toHaveBeenCalledWith('asignacion_docente', 'assignment-1');
    expect(api.createCareerRecord).toHaveBeenCalledWith('asignacion_docente', { user_id: 'teacher-new', parallel_id: 'p-a' });
    expect(wrapper.emitted('changed')?.[0]).toEqual(['Asignado.']);
    wrapper.unmount();
  });
});
