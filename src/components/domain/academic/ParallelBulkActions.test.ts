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
const purge = vi.hoisted(() => ({ requestPurgeConfirmation: vi.fn(), FINALIZED_NOTICE: 'convocatoria_finalizada' }));
vi.mock('@/composables/usePurgeConfirmation', () => purge);
const deadline = vi.hoisted(() => ({ state: null as string | null }));
vi.mock('@/state/deadline', () => ({
    deadlineState: { deadline: { get value() { return deadline.state ? { state: deadline.state } : null; } } },
}));

const scrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterAll(() => { Element.prototype.scrollIntoView = scrollIntoView; });
afterEach(() => {
    deadline.state = null;
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

        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's1', codes: ['B'], shift: 'matutina', user_id: 't1' }, 'unconfirmed');
        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's2', codes: ['A'], shift: 'matutina', user_id: 't1' }, 'unconfirmed');
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

        expect(api.replaceParallelTeacher).toHaveBeenCalledWith('p1', 't1', 'unconfirmed');
        expect(api.deleteCareerRecord).not.toHaveBeenCalled();
        expect(wrapper.emitted('failed')?.[0]?.[0]).toContain('0 de 1 cambios aplicados');
        wrapper.unmount();
    });
    it('cambio masivo de jornada: pregunta una sola vez antes de tocar nada; si cancela, no cambia ningún paralelo', async () => {
        const wrapper = mount(ParallelBulkActions, {
            props: {
                parallelIds: ['p1', 'p2', 'p3'],
                items: [item('s1', [{ id: 'p1', code: 'A', shift: 'vespertina', sent_syllabus: true } as never, { id: 'p2', code: 'B', shift: 'vespertina' }]), item('s2', [{ id: 'p3', code: 'A', shift: 'vespertina' }])],
                shiftOptions: [{ value: 'matutina', label: 'Matutina' }],
                teacherUsers: [],
                assignments: [],
            },
        });
        const setShift = (wrapper.vm as unknown as { $: { setupState: { setShift: (shift: string) => Promise<void> } } }).$.setupState.setShift;

        purge.requestPurgeConfirmation.mockImplementationOnce((_message: string, count: number, _confirmed: () => void, cancelled: () => void) => { expect(count).toBe(1); cancelled(); });
        await setShift('matutina');
        await flushPromises();
        expect(purge.requestPurgeConfirmation).toHaveBeenCalledTimes(1);
        expect(purge.requestPurgeConfirmation.mock.calls[0]![0]).toContain('Si cancela, no se cambia ningún paralelo');
        expect(api.updateParallel).not.toHaveBeenCalled();

        api.updateParallel.mockResolvedValue({ message: 'ok' });
        purge.requestPurgeConfirmation.mockImplementationOnce((_message: string, _count: number, confirmed: () => void) => confirmed());
        await setShift('matutina');
        await flushPromises();
        expect(api.updateParallel.mock.calls).toEqual([
            ['p1', { code: 'A', shift: 'matutina' }, 'confirmed'],
            ['p2', { code: 'B', shift: 'matutina' }, 'unconfirmed'],
            ['p3', { code: 'A', shift: 'matutina' }, 'unconfirmed'],
        ]);
        wrapper.unmount();
    });
    it('con la convocatoria finalizada, asignar docente avisa una sola vez antes de empezar; si cancela, no cambia nada', async () => {
        deadline.state = 'closed';
        const wrapper = mountBar();
        const setTeacher = (wrapper.vm as unknown as { $: { setupState: { setTeacher: (id: string) => Promise<void> } } }).$.setupState.setTeacher;

        purge.requestPurgeConfirmation.mockImplementationOnce((_message: string, _count: number, _confirmed: () => void, cancelled: () => void, mode: string) => { expect(mode).toBe('convocatoria_finalizada'); cancelled(); });
        await setTeacher('t1');
        await flushPromises();
        expect(api.replaceParallelTeacher).not.toHaveBeenCalled();

        api.replaceParallelTeacher.mockResolvedValue({ message: 'ok' });
        purge.requestPurgeConfirmation.mockImplementationOnce((_message: string, _count: number, confirmed: () => void) => confirmed());
        await setTeacher('t1');
        await flushPromises();
        expect(api.replaceParallelTeacher).toHaveBeenCalledWith('p1', 't1', 'confirmed');
        expect(purge.requestPurgeConfirmation).toHaveBeenCalledTimes(2);
        wrapper.unmount();
    });
    it('asignar otro docente donde el sílabo ya tiene trabajo pregunta una sola vez; si cancela, no cambia ningún paralelo', async () => {
        const wrapper = mount(ParallelBulkActions, {
            props: {
                parallelIds: ['p1', 'p2'],
                items: [item('s1', [{ id: 'p1', code: 'A', shift: 'matutina', started_syllabus: true } as never, { id: 'p2', code: 'B', shift: 'matutina' }])],
                shiftOptions: [],
                teacherUsers: [{ id: 't1', name: 'Docente Uno', email: 'a@b.c' }],
                assignments: [],
            },
        });
        const setTeacher = (wrapper.vm as unknown as { $: { setupState: { setTeacher: (id: string) => Promise<void> } } }).$.setupState.setTeacher;

        purge.requestPurgeConfirmation.mockImplementationOnce((message: string, count: number, _confirmed: () => void, cancelled: () => void) => {
            expect(count).toBe(1);
            expect(message).toContain('el nuevo docente lo empieza de cero');
            cancelled();
        });
        await setTeacher('t1');
        await flushPromises();
        expect(api.createCareerRecord).not.toHaveBeenCalled();

        api.createCareerRecord.mockResolvedValue({ message: 'ok' });
        purge.requestPurgeConfirmation.mockImplementationOnce((_message: string, _count: number, confirmed: () => void) => confirmed());
        await setTeacher('t1');
        await flushPromises();
        expect(api.createCareerRecord.mock.calls).toEqual([
            ['asignacion_docente', { user_id: 't1', parallel_id: 'p1' }, 'confirmed'],
            ['asignacion_docente', { user_id: 't1', parallel_id: 'p2' }, 'unconfirmed'],
        ]);
        wrapper.unmount();
    });
});
