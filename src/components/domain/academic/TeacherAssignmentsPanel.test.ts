import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import TeacherAssignmentsPanel from '@/components/domain/academic/TeacherAssignmentsPanel.vue';
import type { TeacherAssignments } from '@/api/career-academics';

vi.mock('@/api/career-academics', () => ({
    removeCareerTeacher: vi.fn(),
    resendCareerTeacherInvitation: vi.fn(),
    updateCareerTeacher: vi.fn(),
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });

const data: TeacherAssignments = {
    canCreateTeacher: true,
    career: { id: 'career-1', name: 'Software', lock_reason: null },
    pendingTeachers: [{ id: 'teacher-pending', name: 'Docente pendiente', email: 'pendiente@example.test' }],
    careerTeachers: [
        { id: 'teacher-pending', name: 'Docente pendiente', email: 'pendiente@example.test', pending_activation: true },
        { id: 'teacher-active', name: 'Docente activo', email: 'activo@example.test', pending_activation: false },
        { id: 'teacher-free', name: 'Docente sin paralelo', email: 'docente2.pruebas@example.test', pending_activation: false },
    ],
    teacherAssignments: [{
        id: 'assignment-1',
        user_id: 'teacher-active',
        parallel_id: 'parallel-1',
        user_name: 'Docente activo',
        user_email: 'activo@example.test',
        parallel_code: 'A',
        subject_name: 'Inteligencia Artificial',
        period_name: '2026-2027',
        period_status: 'proximo',
        period_planning_enabled: true,
        active: true,
        editable: true,
    }],
    options: { parallels: [], teacherUsers: [] },
};

const inactivePendingData: TeacherAssignments = {
    ...data,
    pendingTeachers: [{ id: 'teacher-inactive', name: 'Docente retirado', email: 'retirado@example.test' }],
    careerTeachers: [{ id: 'teacher-inactive', name: 'Docente retirado', email: 'retirado@example.test', pending_activation: true }],
    teacherAssignments: [{
        ...data.teacherAssignments[0],
        id: 'assignment-inactive',
        user_id: 'teacher-inactive',
        user_name: 'Docente retirado',
        user_email: 'retirado@example.test',
        active: false,
        editable: false,
    }],
};

describe('TeacherAssignmentsPanel', () => {
    it('muestra la invitación pendiente dentro de la tabla', () => {
        const wrapper = mount(TeacherAssignmentsPanel, {
            props: { data },
            global: {
                stubs: {
                    Card: passthrough,
                    CardContent: passthrough,
                    CareerAcademicActions: passthrough,
                    ClientFilterBar: passthrough,
                    DropdownMenuItem: passthrough,
                    Field: passthrough,
                    FieldLabel: passthrough,
                    MailCheck: passthrough,
                    Select: passthrough,
                    SelectContent: passthrough,
                    SelectGroup: passthrough,
                    SelectItem: passthrough,
                    SelectTrigger: passthrough,
                    SelectValue: passthrough,
                    Spinner: passthrough,
                    Table: passthrough,
                    TableActionsMenu: passthrough,
                    TableBody: passthrough,
                    TableCell: passthrough,
                    TableEmpty: passthrough,
                    TableHead: passthrough,
                    TableHeader: passthrough,
                    TablePagination: passthrough,
                    TableRow: passthrough,
                    Tooltip: passthrough,
                    TooltipContent: passthrough,
                    TooltipTrigger: passthrough,
                },
            },
        });

        expect(wrapper.text()).toContain('Docente pendiente');
        expect(wrapper.text()).toContain('Pendiente de activación');
        expect(wrapper.text()).toContain('activo@example.test');
        expect(wrapper.text()).not.toContain('Acciones');
        expect(wrapper.text()).not.toContain('Reenviar invitación');
        expect(wrapper.text()).not.toContain('Editar docente');
    });

    it('muestra al docente pendiente sin datos de paralelos', () => {
        const wrapper = mount(TeacherAssignmentsPanel, {
            props: { data: inactivePendingData },
            global: {
                stubs: {
                    Card: passthrough,
                    CardContent: passthrough,
                    CareerAcademicActions: passthrough,
                    ClientFilterBar: passthrough,
                    DropdownMenuItem: passthrough,
                    Field: passthrough,
                    FieldLabel: passthrough,
                    MailCheck: passthrough,
                    Select: passthrough,
                    SelectContent: passthrough,
                    SelectGroup: passthrough,
                    SelectItem: passthrough,
                    SelectTrigger: passthrough,
                    SelectValue: passthrough,
                    Spinner: passthrough,
                    Table: passthrough,
                    TableActionsMenu: passthrough,
                    TableBody: passthrough,
                    TableCell: passthrough,
                    TableEmpty: passthrough,
                    TableHead: passthrough,
                    TableHeader: passthrough,
                    TablePagination: passthrough,
                    TableRow: passthrough,
                    Tooltip: passthrough,
                    TooltipContent: passthrough,
                    TooltipTrigger: passthrough,
                },
            },
        });

        expect(wrapper.text()).toContain('Docente retirado');
        expect(wrapper.text()).toContain('Pendiente de activación');
        expect(wrapper.text()).not.toContain('Inteligencia Artificial');
    });

    it('muestra al docente activo sin paralelo con estado Activa', () => {
        const wrapper = mount(TeacherAssignmentsPanel, {
            props: { data: { ...data, pendingTeachers: [], careerTeachers: [data.careerTeachers[2]], teacherAssignments: [] } },
            global: {
                stubs: {
                    Card: passthrough,
                    CardContent: passthrough,
                    CareerAcademicActions: passthrough,
                    ClientFilterBar: passthrough,
                    DropdownMenuItem: passthrough,
                    Field: passthrough,
                    FieldLabel: passthrough,
                    MailCheck: passthrough,
                    Select: passthrough,
                    SelectContent: passthrough,
                    SelectGroup: passthrough,
                    SelectItem: passthrough,
                    SelectTrigger: passthrough,
                    SelectValue: passthrough,
                    Spinner: passthrough,
                    Table: passthrough,
                    TableActionsMenu: passthrough,
                    TableBody: passthrough,
                    TableCell: passthrough,
                    TableEmpty: passthrough,
                    TableHead: passthrough,
                    TableHeader: passthrough,
                    TablePagination: passthrough,
                    TableRow: passthrough,
                    Tooltip: passthrough,
                    TooltipContent: passthrough,
                    TooltipTrigger: passthrough,
                },
            },
        });

        const text = wrapper.text();
        expect(text).toContain('Docente sin paralelo');
        expect(text).toContain('docente2.pruebas@example.test');
        expect(text).toContain('Activa');
        expect(text).not.toContain('Pendiente de activación');
        expect(text).not.toContain('Reenviar invitación');
    });

    it('abre la ficha del docente con su menú de acciones arriba a la derecha', async () => {
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        const row = wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente pendiente'))!;
        await row.trigger('click');
        await flushPromises();

        expect(document.body.textContent).toContain('Editar docente');
        const menu = document.body.querySelector('button[aria-label="Acciones para Docente pendiente"]');
        expect(menu).not.toBeNull();
        wrapper.unmount();
    });
});
