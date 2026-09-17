import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import CurriculumLegendPanel from '@/components/domain/academic/curriculum/CurriculumLegendPanel.vue';

describe('CurriculumLegendPanel', () => {
    it('inicia expandido y permite contraer y restaurar la información', async () => {
        const wrapper = mount(CurriculumLegendPanel, {
            props: {
                units: [
                    {
                        unit: 'Unidad básica',
                        style: { backgroundColor: 'hsl(213 55% 47%)' },
                    },
                ],
                rows: [{ id: 'subjects', label: 'N° asignaturas', value: '43' }],
            },
        });
        const button = wrapper.get('button');

        expect(button.attributes('aria-expanded')).toBe('true');
        expect(button.attributes('aria-label')).toBe('Contraer leyenda y totales');
        expect(wrapper.text()).toContain('Prerrequisito');
        expect(wrapper.text()).toContain('N° asignaturas');

        await button.trigger('click');

        expect(button.attributes('aria-expanded')).toBe('false');
        expect(button.attributes('aria-label')).toBe('Expandir leyenda y totales');
        expect(wrapper.text()).not.toContain('Prerrequisito');

        await button.trigger('click');

        expect(button.attributes('aria-expanded')).toBe('true');
        expect(wrapper.text()).toContain('N° asignaturas');
    });
});
