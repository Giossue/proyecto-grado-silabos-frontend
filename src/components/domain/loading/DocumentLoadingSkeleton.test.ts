import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import DocumentLoadingSkeleton from '@/components/domain/loading/DocumentLoadingSkeleton.vue';

describe('DocumentLoadingSkeleton', () => {
    it.each(['syllabus', 'review', 'template', 'comparison', 'documents'] as const)(
        'mantiene las superficies de %s sin controles ni anuncios adicionales',
        (variant) => {
            const wrapper = mount(DocumentLoadingSkeleton, { props: { variant } });

            expect(wrapper.findAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
            expect(wrapper.find('button, input, textarea, select, a, [tabindex], [role="status"]').exists()).toBe(false);
        },
    );

    it('imita el editor: pestañas, una tarjeta con campos y el botón Siguiente debajo, sin ícono ni cabecera propia', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'syllabus' } });
        const card = wrapper.get('[data-skeleton="syllabus-section"]');

        expect(wrapper.find('.max-w-screen-2xl').exists()).toBe(true);
        expect(wrapper.get('[data-skeleton="syllabus-tabs"]').findAll('[data-slot="skeleton"]').length).toBeGreaterThan(1);
        expect(card.findAll('[data-skeleton="syllabus-field"]').length).toBeGreaterThan(0);
        expect(card.find('[data-skeleton="syllabus-nav"]').exists()).toBe(false);
        expect(wrapper.get('[data-skeleton="syllabus-nav"]').element.previousElementSibling).toBe(card.element);
        expect(wrapper.find('[data-skeleton="unit-assistant"]').exists()).toBe(false);
        expect(wrapper.find('[data-skeleton="academic-context"]').exists()).toBe(false);
        expect(wrapper.find('[data-skeleton="syllabus-presentation"]').exists()).toBe(false);
    });

    it('en biblioteca muestra solo la tarjeta de bibliografía, como la pantalla', () => {
        const wrapper = mount(DocumentLoadingSkeleton, {
            props: { variant: 'review', reviewStage: 'library' },
        });

        expect(wrapper.find('[data-skeleton="library-bibliography"]').exists()).toBe(true);
        expect(wrapper.findAll('[data-skeleton="review-section"]')).toHaveLength(2);
        expect(wrapper.find('[data-skeleton="review-heading"]').exists()).toBe(false);
        expect(wrapper.find('[data-skeleton="review-approval"]').exists()).toBe(false);
    });

    it('muestra las acciones de coordinación en su expediente', () => {
        const coordination = mount(DocumentLoadingSkeleton, { props: { variant: 'review' } });

        expect(coordination.find('[data-skeleton="review-correction"]').exists()).toBe(true);
        expect(coordination.find('[data-skeleton="review-observations"]').exists()).toBe(false);
        expect(coordination.find('[data-skeleton="review-heading"]').exists()).toBe(true);
    });

    it('representa las hojas vertical y horizontal del constructor vigente', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'template' } });
        const pages = wrapper.get('[data-skeleton="template-pages"]');
        const paper = wrapper.get('[data-orientation="portrait"]');
        const landscape = wrapper.get('[data-orientation="landscape"]');

        expect(pages.classes()).toContain('flex-col');
        expect(paper.classes()).toContain('template-sheet');
        expect(landscape.classes()).toContain('template-sheet--landscape');
        expect(wrapper.findAll('[data-skeleton="template-page"]')).toHaveLength(2);
        expect(wrapper.find('.sticky').exists()).toBe(false);
        expect(wrapper.find('[data-skeleton="template-toolbar"]').exists()).toBe(false);
    });

    it('compara las revisiones en un resumen y cambios con dos lados', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'comparison', rows: 2 } });

        expect(wrapper.findAll('[data-skeleton="comparison-summary"]')).toHaveLength(1);
        expect(wrapper.findAll('[data-skeleton="comparison-change"]')).toHaveLength(2);
    });

    it('el PDF del sílabo carga como la única línea de estado de la pantalla', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'documents', rows: 2 } });

        expect(wrapper.find('[data-skeleton="document-status"]').exists()).toBe(true);
        expect(wrapper.find('[data-skeleton="table-row"]').exists()).toBe(false);
    });
});
