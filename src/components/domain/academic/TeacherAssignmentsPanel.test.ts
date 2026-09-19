import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import TeacherAssignmentsPanel from '@/components/domain/academic/TeacherAssignmentsPanel.vue';
import type { TeacherAssignments } from '@/api/career-academics';

vi.mock('@/api/career-academics', () => ({
    resendCareerTeacherInvitation: vi.fn(),
}));

const passthrough = defineComponent({ template: '<div><slot /></div>' });

const data: TeacherAssignments = {
    canCreateTeacher: true,
    career: { id: 'career-1', name: 'Software', lock_reason: null },
    pendingTeachers: [{ id: 'teacher-pending', name: 'Docente pendiente', email: 'pendiente@example.test' }],
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
                    TeacherReliefSheet: passthrough,
                    Tooltip: passthrough,
                    TooltipContent: passthrough,
                    TooltipTrigger: passthrough,
                    UserRoundCog: passthrough,
                },
            },
        });

        expect(wrapper.text()).toContain('Docente pendiente');
        expect(wrapper.text()).toContain('Pendiente de activación');
        expect(wrapper.text()).toContain('Reenviar invitación');
        expect(wrapper.text()).not.toContain('Invitaciones pendientes');
    });
});
