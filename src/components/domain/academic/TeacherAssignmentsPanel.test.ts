import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TeacherAssignmentsPanel from '@/components/domain/academic/TeacherAssignmentsPanel.vue';
import { removeCareerTeacher, type TeacherAssignments } from '@/api/career-academics';
import { DIALOG_EXIT_MS } from '@/lib/dialogExit';

vi.mock('@/api/career-academics', () => ({
    removeCareerTeacher: vi.fn(),
}));

// Simula la animación de salida: el modal cerrado sigue en pantalla hasta que termina.
const keepClosingDialogs = (): void => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
        const style = real(element, pseudo);
        return element.getAttribute('data-state') === 'closed' ? new Proxy(style, { get: (target, key) => (key === 'animationName' ? 'exit' : Reflect.get(target, key)) }) : style;
    });
};

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
    afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ''; });

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
        expect(wrapper.text()).toContain('Pendiente');
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
        expect(wrapper.text()).toContain('Pendiente');
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
        expect(text).not.toContain('Pendiente');
        expect(text).not.toContain('Reenviar invitación');
    });

    it('abre la ficha del docente pendiente con «Quitar de la carrera» arriba a la derecha', async () => {
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        const row = wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente pendiente'))!;
        await row.trigger('click');
        await flushPromises();

        expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('Docente');
        expect(document.body.querySelector('button[aria-label="Quitar de la carrera"]')).not.toBeNull();
        wrapper.unmount();
    });

    it('con una sola acción muestra el icono directo en lugar del menú', async () => {
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        const row = wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente activo'))!;
        await row.trigger('click');
        await flushPromises();

        expect(document.body.querySelector('button[aria-label="Quitar de la carrera"]')).not.toBeNull();
        expect(document.body.querySelector('button[aria-label="Acciones para Docente activo"]')).toBeNull();
        expect(document.body.querySelector('[data-slot="tooltip-content"]')).toBeNull();
        wrapper.unmount();
    });

    it('con la cuenta pendiente no deja editar nombre ni correo ni reenviar la invitación', async () => {
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        await wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente pendiente'))!.trigger('click');
        await flushPromises();

        const dialog = document.body.querySelector('[role="dialog"]')!;
        const inputs = [...dialog.querySelectorAll<HTMLInputElement>('input')];
        expect(inputs.length).toBeGreaterThan(0);
        expect(inputs.every((input) => input.disabled)).toBe(true);
        expect(inputs.map((input) => input.value)).toContain('pendiente@example.test');
        const buttons = [...dialog.querySelectorAll('button')].map((button) => button.textContent?.trim());
        expect(buttons).not.toContain('Guardar cambios');
        expect(dialog.textContent).not.toContain('Reenviar invitación');
        expect(dialog.querySelector('button[aria-label="Acciones para Docente pendiente"]')).toBeNull();
        wrapper.unmount();
    });

    it('con la cuenta activa solo ofrece cerrar, sin guardar cambios', async () => {
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        const row = wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente activo'))!;
        await row.trigger('click');
        await flushPromises();

        const buttons = [...document.body.querySelectorAll('[data-slot="sheet-footer"] button, [role="dialog"] button')].map((button) => button.textContent?.trim());
        expect(buttons).toContain('Cerrar');
        expect(buttons).not.toContain('Guardar cambios');
        expect(buttons).not.toContain('Cancelar');
        wrapper.unmount();
    });

    it('al quitar a un docente, el modal conserva su nombre mientras se cierra', async () => {
        keepClosingDialogs();
        vi.mocked(removeCareerTeacher).mockResolvedValue({ message: 'Docente quitado.' } as never);
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        await wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente activo'))!.trigger('click');
        await flushPromises();
        document.body.querySelector<HTMLButtonElement>('button[aria-label="Quitar de la carrera"]')!.click();
        await flushPromises();
        const confirm = [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"][data-state="open"] button')].find((button) => button.textContent?.trim() === 'Quitar de la carrera')!;
        confirm.click();
        await flushPromises();

        expect(removeCareerTeacher).toHaveBeenCalledWith('teacher-active');
        expect(wrapper.emitted('changed')).toEqual([['Docente quitado.']]);
        const closing = [...document.body.querySelectorAll('[role="dialog"][data-state="closed"]')].map((dialog) => dialog.textContent ?? '');
        expect(closing.some((text) => text.includes('Quitar a Docente activo de la carrera'))).toBe(true);
        wrapper.unmount();
    });

    it('la ficha del docente se retira cuando termina la animación de salida', async () => {
        keepClosingDialogs();
        vi.useFakeTimers();
        const wrapper = mount(TeacherAssignmentsPanel, { props: { data }, attachTo: document.body });
        await wrapper.findAll('tbody tr').find((item) => item.text().includes('Docente activo'))!.trigger('click');
        await flushPromises();
        const close = [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === 'Cerrar')!;
        close.click();
        await flushPromises();
        expect(wrapper.findComponent({ name: 'CareerTeacherEditSheet' }).exists()).toBe(true);

        await vi.advanceTimersByTimeAsync(DIALOG_EXIT_MS);
        expect(wrapper.findComponent({ name: 'CareerTeacherEditSheet' }).exists()).toBe(false);
        wrapper.unmount();
    });
});
