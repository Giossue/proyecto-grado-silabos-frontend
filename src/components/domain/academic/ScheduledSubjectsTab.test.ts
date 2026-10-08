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
    subject_id: `s-${id}`, period_id: 'p1', label: name, subject_code: code, subject_name: name, subject_cycle: cycle,
    period_starts_on: '2026-09-23', period_ends_on: '2026-09-25', period_status: 'en_curso', period_status_label: 'En curso',
    period_planning_enabled: true, campus_name: 'Matriz', modality_name: 'Presencial',
    parallels: parallels.map((parallel, index) => ({ id: `${id}-${index}`, ...parallel })), editable: true,
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

const mountTab = (value: ScheduledSubjects = data) => mount(ScheduledSubjectsTab, {
    props: { data: value, assignments: [], teacherUsers: [] },
    global: {
        stubs: {
            Card: passthrough, CardContent: passthrough, ParallelCreationSheet: { props: ['open', 'subjectLabel'], template: '<div class="parallel-sheet">{{ subjectLabel }}</div>' }, ClientFilterBar: passthrough,
            Field: passthrough, FieldLabel: passthrough, Select: SelectStub, SelectContent: passthrough, SelectGroup: passthrough,
            SelectItem: passthrough, SelectTrigger: passthrough, SelectValue: passthrough, Badge: passthrough, Alert: passthrough,
            AlertDescription: passthrough, Table: passthrough, TableBody: passthrough, TableCell: passthrough, TableEmpty: passthrough,
            TableHead: passthrough, TableHeader: passthrough, TableRow: passthrough, TablePagination: passthrough,
        },
    },
});

describe('ScheduledSubjectsTab', () => {
    it('no muestra la ficha: vive en Proyecto de carrera', () => {
        const wrapper = mountTab();
        expect(wrapper.text()).not.toContain('Ficha');
        expect(wrapper.findAll('button').filter((button) => button.text() === 'Ficha')).toHaveLength(0);
    });
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

    it('no tiene columna de acciones: un clic en la fila abre Paralelos y docentes', async () => {
        const wrapper = mountTab();
        expect(wrapper.text()).not.toContain('Acciones');
        expect(wrapper.find('.parallel-sheet').exists()).toBe(false);

        await wrapper.findAll('div').find((item) => item.text().startsWith('Bases de Datos'))!.trigger('click');
        expect(wrapper.get('.parallel-sheet').text()).toBe('Bases de Datos');
    });

    it('no abre la hoja si la edición está bloqueada o el período es de solo lectura', async () => {
        const locked = mountTab({ ...data, career: { ...data.career, lock_reason: 'Convocatoria activa' } });
        await locked.findAll('div').find((item) => item.text().startsWith('Bases de Datos'))!.trigger('click');
        expect(locked.find('.parallel-sheet').exists()).toBe(false);

        const readonly = mountTab({ ...data, scheduledSubjects: data.scheduledSubjects.map((item) => ({ ...item, period_planning_enabled: false })) });
        await readonly.findAll('div').find((item) => item.text().startsWith('Bases de Datos'))!.trigger('click');
        expect(readonly.find('.parallel-sheet').exists()).toBe(false);
    });
});
