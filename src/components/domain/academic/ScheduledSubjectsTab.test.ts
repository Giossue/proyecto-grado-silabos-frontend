import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import ScheduledSubjectsTab from '@/components/domain/academic/ScheduledSubjectsTab.vue';
import type { ScheduledSubjects } from '@/api/career-academics';

const passthrough = defineComponent({ template: '<div><slot /><slot name="filters" /></div>' });
const SelectStub = defineComponent({
    name: 'SelectStub',
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    template: '<div class="select-stub"><slot /></div>',
});

const row = (id: string, name: string, code: string, cycle: number | null, parallels: Array<{ code: string; shift: string | null }>): ScheduledSubjects['scheduledSubjects'][number] => ({
    id, subject_id: `s-${id}`, period_id: 'p1', label: name, subject_code: code, subject_name: name, subject_cycle: cycle,
    period_starts_on: '2026-09-23', period_ends_on: '2026-09-25', period_status: 'en_curso', period_status_label: 'En curso',
    period_planning_enabled: true, campus_name: 'Matriz', modality_name: 'Presencial',
    parallels: parallels.map((parallel, index) => ({ id: `${id}-${index}`, ...parallel })), active: true, editable: true,
});

const data: ScheduledSubjects = {
    career: { id: 'c1', name: 'Software', lock_reason: null },
    selectedPeriodId: 'p1',
    scheduledSubjects: [
        row('1', 'Arquitectura de Software', 'SW-601', 6, [{ code: 'A', shift: 'matutina' }]),
        row('2', 'Bases de Datos', 'SW-301', 3, [{ code: 'B', shift: 'nocturna' }]),
        row('3', 'Cálculo', 'MA-101', 1, [{ code: 'A', shift: 'nocturna' }]),
    ],
    options: {
        shiftOptions: [{ value: 'matutina', label: 'Matutina' }, { value: 'nocturna', label: 'Nocturna' }],
        periods: [{ id: 'p1', code: 'Septiembre-Septiembre 2026', starts_on: '2026-09-23', ends_on: '2026-09-25', status: 'en_curso', status_label: 'En curso', planning_enabled: true }],
        activeSubjects: [],
        scheduledSubjects: [],
    },
};

const mountTab = () => mount(ScheduledSubjectsTab, {
    props: { data },
    global: {
        stubs: {
            Card: passthrough, CardContent: passthrough, CareerAcademicActions: passthrough, ClientFilterBar: passthrough,
            Field: passthrough, FieldLabel: passthrough, Select: SelectStub, SelectContent: passthrough, SelectGroup: passthrough,
            SelectItem: passthrough, SelectTrigger: passthrough, SelectValue: passthrough, Badge: passthrough, Alert: passthrough,
            AlertDescription: passthrough, Table: passthrough, TableBody: passthrough, TableCell: passthrough, TableEmpty: passthrough,
            TableHead: passthrough, TableHeader: passthrough, TableRow: passthrough, TablePagination: passthrough,
        },
    },
});

describe('ScheduledSubjectsTab', () => {
    it('ofrece selectores de ciclo, paralelo y jornada derivados de los datos', () => {
        const text = mountTab().text();

        expect(text).toContain('Todos los ciclos');
        expect(text).toContain('6.º ciclo');
        expect(text).toContain('Todos los paralelos');
        expect(text).toContain('Paralelo B');
        expect(text).toContain('Todas las jornadas');
        expect(text).toContain('Nocturna');
    });

    it('filtra por ciclo, paralelo y jornada por separado', async () => {
        const wrapper = mountTab();
        const selects = wrapper.findAllComponents(SelectStub);
        await selects[2].vm.$emit('update:modelValue', 'nocturna');
        expect(wrapper.text()).not.toContain('Arquitectura de Software');
        expect(wrapper.text()).toContain('Bases de Datos');
        expect(wrapper.text()).toContain('Cálculo');

        await selects[1].vm.$emit('update:modelValue', 'A');
        expect(wrapper.text()).not.toContain('Bases de Datos');
        expect(wrapper.text()).toContain('Cálculo');

        await selects[0].vm.$emit('update:modelValue', '3');
        expect(wrapper.text()).toContain('No hay materias que coincidan con los filtros.');
    });
});
