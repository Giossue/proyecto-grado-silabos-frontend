import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCareerRecord, updateCareerRecord } from '@/api/career-academics';
import CurriculumVisualSubjectForm from '@/components/domain/academic/curriculum/CurriculumVisualSubjectForm.vue';
import type { CurriculumBuilderSubject } from '@/types/academic';

vi.mock('@/api/career-academics', () => ({ createCareerRecord: vi.fn(), updateCareerRecord: vi.fn() }));

const passthrough = defineComponent({ template: '<div><slot /></div>' });
const SwitchStub = defineComponent({
    props: { modelValue: { type: Boolean, default: false } },
    emits: ['update:modelValue'],
    template: '<button type="button" role="switch" :aria-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)" />',
});

const subject = (generates: boolean): CurriculumBuilderSubject => ({
    id: 's1', code: 'SW-801', name: 'Prácticas', cycle: 8, position: 0, organization_unit: 'profesional', organization_unit_label: 'Profesional',
    modality: null, modality_label: null, credits: '4', total_hours: 192, active: true, generates_syllabus: generates, system_values: {}, display_fields: [],
});

const mountForm = (value: CurriculumBuilderSubject | null) => mount(CurriculumVisualSubjectForm, {
    props: {
        career: { id: 'c1', name: 'Software', modality: null } as never,
        modalityOptions: [],
        curriculum: {} as never,
        fixedFields: [],
        subject: value,
        cycle: 8,
        position: 0,
        organizationUnits: [],
    },
    global: {
        stubs: {
            Switch: SwitchStub, Select: passthrough, SelectContent: passthrough, SelectGroup: passthrough, SelectItem: passthrough,
            SelectTrigger: passthrough, SelectValue: passthrough, DialogFooter: passthrough,
        },
    },
});

describe('CurriculumVisualSubjectForm', () => {
    beforeEach(() => {
        vi.mocked(createCareerRecord).mockReset().mockResolvedValue({ message: 'Materia creada.' } as never);
        vi.mocked(updateCareerRecord).mockReset().mockResolvedValue({ message: 'Materia actualizada.' } as never);
    });

    it('una materia nueva genera sílabos y el interruptor lo apaga', async () => {
        const wrapper = mountForm(null);
        const toggle = wrapper.get('[role="switch"]');
        expect(toggle.attributes('aria-checked')).toBe('true');
        expect(wrapper.text()).toContain('Puede generar sílabos');

        await toggle.trigger('click');
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(createCareerRecord).toHaveBeenCalledWith('asignatura', expect.objectContaining({ generates_syllabus: '0' }));
    });

    it('al editar conserva el valor de la materia', async () => {
        const wrapper = mountForm(subject(false));
        expect(wrapper.get('[role="switch"]').attributes('aria-checked')).toBe('false');

        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(updateCareerRecord).toHaveBeenCalledWith('asignatura', 's1', expect.objectContaining({ generates_syllabus: '0' }));
    });

    it('el código repetido se muestra una sola vez y se quita al corregir el código', async () => {
        const { ApiError } = await import('@/api/client');
        vi.mocked(createCareerRecord).mockRejectedValue(new ApiError('Ya existe una materia con ese código.', 422, { code: ['Ya existe una materia con ese código.'] }));
        const wrapper = mountForm(null);
        await wrapper.get('form').trigger('submit');
        await flushPromises();

        expect(wrapper.text().split('Ya existe una materia con ese código')).toHaveLength(2);
        await wrapper.get('input[name="code"]').setValue('SW-802');
        expect(wrapper.text()).not.toContain('Ya existe una materia con ese código');
    });
});
