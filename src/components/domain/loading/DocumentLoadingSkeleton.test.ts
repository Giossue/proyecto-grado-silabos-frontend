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

    it('usa el layout documental y la altura real del asistente docente', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'syllabus' } });
        const layout = wrapper.get('.workspace-layout[data-layout="syllabus"]');

        expect(layout.find(':scope > main').exists()).toBe(true);
        expect(layout.get(':scope > aside').find('.assistant-panel').exists()).toBe(true);
        expect(wrapper.findAll('[data-skeleton="academic-context"]')).toHaveLength(1);
        expect(wrapper.find('[data-skeleton="syllabus-presentation"]').exists()).toBe(false);
    });

    it('presenta la cabecera institucional del sílabo de consulta', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'syllabus', readonly: true } });

        expect(wrapper.find('[data-skeleton="syllabus-presentation"]').exists()).toBe(true);
        expect(wrapper.find('.size-7').exists()).toBe(false);
    });

    it('limita biblioteca a bibliografía con aprobación, comentario e historial', () => {
        const wrapper = mount(DocumentLoadingSkeleton, {
            props: { variant: 'review', reviewStage: 'library' },
        });

        expect(wrapper.findAll('[data-skeleton="review-section"]')).toHaveLength(1);
        expect(wrapper.find('[data-skeleton="review-correction"]').exists()).toBe(true);
        expect(wrapper.find('[data-skeleton="review-approval"]').exists()).toBe(true);
        expect(wrapper.find('[data-skeleton="review-history"]').exists()).toBe(true);
    });

    it('muestra las acciones de coordinación en su expediente', () => {
        const coordination = mount(DocumentLoadingSkeleton, { props: { variant: 'review' } });

        expect(coordination.find('[data-skeleton="review-correction"]').exists()).toBe(true);
        expect(coordination.find('[data-skeleton="review-observations"]').exists()).toBe(false);
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
    });

    it('presenta la exportación como avisos y una tabla adaptable con filas y paginación', () => {
        const wrapper = mount(DocumentLoadingSkeleton, { props: { variant: 'documents', rows: 2 } });

        expect(wrapper.findAll('[data-skeleton="document-notice"]')).toHaveLength(2);
        expect(wrapper.findAll('[data-skeleton="table-row"]')).toHaveLength(2);
        expect(wrapper.find('[data-skeleton="table-mobile"]').exists()).toBe(true);
        expect(wrapper.find('[data-skeleton="table-filters"]').exists()).toBe(true);
        expect(wrapper.find('[data-skeleton="table-pagination"]').exists()).toBe(true);
    });
});
