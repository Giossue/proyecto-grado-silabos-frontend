import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParallelBulkActions from '@/components/domain/academic/ParallelBulkActions.vue';

const api = vi.hoisted(() => ({
    createParallels: vi.fn(),
    updateParallel: vi.fn(),
    deleteCareerRecord: vi.fn(),
    createCareerRecord: vi.fn(),
}));
vi.mock('@/api/career-academics', () => api);

afterEach(() => vi.clearAllMocks());

const item = (id: string, parallels: Array<{ id: string; code: string; shift: string }>) => ({
    subject_id: id, label: id, subject_code: id, subject_name: id, subject_cycle: 1, campus_name: null, modality_name: null, parallels, editable: true,
});
const mountBar = () => mount(ParallelBulkActions, {
    props: {
        items: [item('s1', [{ id: 'p1', code: 'A', shift: 'matutina' }]), item('s2', [])],
        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'vespertina', label: 'Vespertina' }],
        teacherUsers: [{ id: 't1', name: 'Docente Uno', email: 'a@b.c' }],
        assignments: [{ id: 'as1', user_id: 't9', parallel_id: 'p1', user_name: 'Otro', user_email: 'o@b.c', parallel_code: 'A', subject_name: 's1', active: true, editable: true }],
    },
    global: { stubs: { DropdownMenu: false } },
});

describe('ParallelBulkActions', () => {
    it('muestra cuántas materias hay seleccionadas', () => {
        expect(mountBar().text()).toContain('2 materias seleccionadas');
    });

    it('agrega el siguiente paralelo libre a cada materia con la jornada elegida', async () => {
        api.createParallels.mockResolvedValue({ message: 'ok' });
        const wrapper = mountBar();
        await (wrapper.vm as unknown as { $: { setupState: { addParallel: (shift: string) => Promise<void> } } }).$.setupState.addParallel('vespertina');
        await flushPromises();

        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's1', codes: ['B'], shift: 'vespertina' });
        expect(api.createParallels).toHaveBeenCalledWith({ subject_id: 's2', codes: ['A'], shift: 'vespertina' });
        expect(wrapper.emitted('changed')?.[0]).toEqual(['Paralelo agregado a 2 materias.']);
        expect(wrapper.emitted('clear')).toHaveLength(1);
    });

    it('reemplaza el docente solo donde cambia y avisa los fallos parciales', async () => {
        api.deleteCareerRecord.mockResolvedValue({ message: 'ok' });
        api.createCareerRecord.mockRejectedValue(new Error('x'));
        const wrapper = mountBar();
        await (wrapper.vm as unknown as { $: { setupState: { setTeacher: (id: string) => Promise<void> } } }).$.setupState.setTeacher('t1');
        await flushPromises();

        expect(api.deleteCareerRecord).toHaveBeenCalledWith('asignacion_docente', 'as1');
        expect(api.createCareerRecord).toHaveBeenCalledWith('asignacion_docente', { user_id: 't1', parallel_id: 'p1' });
        expect(wrapper.emitted('failed')?.[0]?.[0]).toContain('0 de 1 cambios aplicados');
    });
});
