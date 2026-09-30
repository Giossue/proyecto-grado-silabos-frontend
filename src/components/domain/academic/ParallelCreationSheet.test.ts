import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParallelCreationSheet from '@/components/domain/academic/ParallelCreationSheet.vue';

const api = vi.hoisted(() => ({
  createParallels: vi.fn(),
  updateParallel: vi.fn(),
  deleteParallel: vi.fn(),
}));
vi.mock('@/api/career-academics', () => api);

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

const mountSheet = () => mount(ParallelCreationSheet, {
  attachTo: document.body,
  props: {
    open: true,
    shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }, { value: 'nocturna', label: 'Nocturna' }], scheduledSubjectId: 'scheduled-1',
    scheduledSubjectLabel: 'SW-1 · Materia',
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
    const input = document.body.querySelector<HTMLInputElement>('#parallel-code-scheduled-1')!;
    input.value = 'C';
    input.dispatchEvent(new Event('input'));
    await flushPromises();
    document.body.querySelector('form')!.dispatchEvent(new Event('submit'));
    await flushPromises();

    expect(api.createParallels).toHaveBeenCalledWith({ scheduled_subject_id: 'scheduled-1', codes: ['C'], shift: 'matutina' });
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
});
