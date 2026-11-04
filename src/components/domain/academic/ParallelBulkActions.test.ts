import { flushPromises, mount } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ParallelBulkActions from '@/components/domain/academic/ParallelBulkActions.vue';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';

const api = vi.hoisted(() => ({
    createParallels: vi.fn(),
    updateParallel: vi.fn(),
    deleteCareerRecord: vi.fn(),
    createCareerRecord: vi.fn(),
    replaceParallelTeacher: vi.fn(),
    askFinalizedNoticeOnce: <T>(run: () => Promise<T>): Promise<T> => run(),
}));
vi.mock('@/api/career-academics', () => api);

const scrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Element.prototype.scrollIntoView = scrollIntoView; });
afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
});

const item = (id: string, parallels: Array<{ id: string; code: string; shift: string }>) => ({
    subject_id: id, label: id, subject_code: id, subject_name: id, subject_cycle: 1, generates_syllabus: true, campus_name: null, modality_name: null, parallels, editable: true,
});
const mountBar = () => mount(ParallelBulkActions, {
    attachTo: document.body,
    props: {
        parallelIds: ['p1'],
        items: [item('s1', [{ id: 'p1', code: 'A', shift: 'matutina' }]), item('s2', [])],
        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }],
        teacherUsers: [{ id: 't1', name: 'Docente Uno', email: 'a@b.c' }],
        assignments: [{ id: 'as1', user_id: 't9', parallel_id: 'p1', user_name: 'Otro', user_email: 'o@b.c', parallel_code: 'A', subject_name: 's1', active: true, editable: true }],
    },
    global: { stubs: { DropdownMenu: false } },
});

describe('ParallelBulkActions', () => {
    it('muestra cuántas materias hay seleccionadas', () => {
        const wrapper = mountBar();
        expect(wrapper.text()).toContain('2 materias y 1 paralelo seleccionado');
        wrapper.unmount();
    });

    it('agrega el siguiente paralelo libre a cada materia con jornada y docente juntos', async () => {
        vi.useFakeTimers();
        api.createParallels.mockResolvedValue({ message: 'ok' });
        const wrapper = mountBar();
        (wrapper.vm as unknown as { $: { setupState: { openAdd: () => void } } }).$.setupState.openAdd();
        await flushPromises();
        document.body.querySelector<HTMLButtonElement>('button[aria-label="Docente de los nuevos paralelos"]')!.click();
        await flushPromises();
        document.body.querySelector<HTMLElement>('[data-slot="command-item"]')!.click();
        await flushPromises();
        [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Agregar paralelos')!.click();
        await flushPromises();

        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's1', codes: ['B'], shift: 'matutina', user_id: 't1' });
        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's2', codes: ['A'], shift: 'matutina', user_id: 't1' });
        expect(wrapper.emitted('changed')?.[0]).toEqual(['Paralelo agregado a 2 materias']);
        // Quitar la selección retira esta barra y su modal: espera a que el modal termine de cerrarse.
        expect(wrapper.emitted('clear')).toBeUndefined();
        await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
        expect(wrapper.emitted('clear')).toHaveLength(1);
        wrapper.unmount();
    });

    it('«Agregar paralelos» queda deshabilitado mientras falte la jornada o el docente', async () => {
        const wrapper = mountBar();
        (wrapper.vm as unknown as { $: { setupState: { openAdd: () => void } } }).$.setupState.openAdd();
        await flushPromises();
        const add = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Agregar paralelos')!;
        add.click();
        await flushPromises();

        expect(add.disabled).toBe(true);
        expect(api.createParallels).not.toHaveBeenCalled();
        expect(wrapper.emitted('clear')).toBeUndefined();
        wrapper.unmount();
    });

    it('reemplaza el docente solo donde cambia y avisa los fallos parciales', async () => {
        api.replaceParallelTeacher.mockRejectedValue(new Error('x'));
        const wrapper = mountBar();
        await (wrapper.vm as unknown as { $: { setupState: { setTeacher: (id: string) => Promise<void> } } }).$.setupState.setTeacher('t1');
        await flushPromises();

        expect(api.replaceParallelTeacher).toHaveBeenCalledWith('p1', 't1');
        expect(api.deleteCareerRecord).not.toHaveBeenCalled();
        expect(wrapper.emitted('failed')?.[0]?.[0]).toContain('0 de 1 cambios aplicados');
        wrapper.unmount();
    });
});
