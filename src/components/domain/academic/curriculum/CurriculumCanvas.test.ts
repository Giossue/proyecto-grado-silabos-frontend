import { flushPromises, shallowMount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import CurriculumCanvas from '@/components/domain/academic/curriculum/CurriculumCanvas.vue';
import type { CurriculumBuilderSubject } from '@/types/academic';

const { updateSubjectLayout } = vi.hoisted(() => ({
    updateSubjectLayout: vi.fn().mockResolvedValue({ message: 'Posición actualizada.' }),
}));
vi.mock('@/api/career-academics', () => ({
    updateSubjectLayout,
    createSubjectRequirement: vi.fn(),
    deleteSubjectRequirement: vi.fn(),
}));
vi.mock('@vue-flow/core', () => ({
    VueFlow: { name: 'VueFlow', props: ['nodes', 'edges'], template: '<div><slot /></div>' },
    useVueFlow: () => ({ setNodes: vi.fn(), setEdges: vi.fn(), updateNode: vi.fn() }),
    ConnectionMode: { Loose: 'loose' },
    MarkerType: { ArrowClosed: 'arrowclosed' },
    Handle: { template: '<div />' },
    Position: { Top: 'top', Bottom: 'bottom' },
}));
vi.mock('@vue-flow/controls', () => ({ Controls: { template: '<div />' } }));
vi.mock('@vue-flow/minimap', () => ({ MiniMap: { template: '<div />' } }));

const subject = (id: string, position: number): CurriculumBuilderSubject => ({
    id,
    code: `SW-${id}`,
    name: `Materia ${id}`,
    cycle: 1,
    position,
    organization_unit: null,
    modality: null,
    modality_label: null,
    credits: null,
    total_hours: null,
    active: true,
    system_values: {},
    display_fields: [],
});

describe('CurriculumCanvas', () => {
    it('previsualiza el nuevo orden dentro del ciclo y envía ese ciclo al guardar', async () => {
        updateSubjectLayout.mockClear();
        const wrapper = shallowMount(CurriculumCanvas, {
            props: {
                career: { id: 'career', name: 'Software', modality: null },
                curriculum: { id: 'career', cycle_count: 2, editable: true, lock_reason: null },
                fixedFields: [],
                fixedFieldTotals: [],
                subjects: [subject('a', 0), subject('b', 1), subject('c', 2)],
                requirements: [],
                organizationUnits: [],
                modalityOptions: [],
            },
        });
        const flow = wrapper.findComponent({ name: 'VueFlow' });
        const initialNodes = flow.props('nodes') as Array<{
            id: string;
            position: { x: number; y: number };
            data: { cycle?: number };
            extent?: [[number, number], [number, number]];
        }>;
        expect(initialNodes.find((node) => node.id === 'add-subject-1')?.position.x)
            .toBeGreaterThan((initialNodes.find((node) => node.id === 'c')?.position.x ?? 0) + 274);
        const bounds = initialNodes.find((node) => node.id === 'a')?.extent;
        expect(bounds?.[1][0]).toBeGreaterThan((initialNodes.find((node) => node.id === 'c')?.position.x ?? 0) + 274);
        expect(bounds?.[1][1]).toBeGreaterThan(bounds?.[0][1] ?? 0);
        const dragged = { ...flow.props('nodes').find((node: { id: string }) => node.id === 'a'),
            position: { x: 145 + 2 * 308, y: 238 + 48 } };

        flow.vm.$emit('node-drag', { node: dragged });
        await nextTick();
        const preview = flow.props('nodes') as Array<{ id: string; position: { x: number; y: number } }>;
        expect(preview.find((node) => node.id === 'b')?.position.x).toBe(145);
        expect(preview.find((node) => node.id === 'c')?.position.x).toBe(145 + 308);
        expect(preview.find((node) => node.id === 'a')?.position.y).toBe(32);

        flow.vm.$emit('node-drag', { node: { ...dragged, position: { ...dragged.position, y: -200 } } });
        await nextTick();
        expect((flow.props('nodes') as typeof preview).find((node) => node.id === 'a')?.position.y).toBe(32);

        // Vue Flow puede entregar en drag-stop la posición anterior mientras sincroniza
        // su modelo; el índice confirmado es el que mostró el último drag.
        flow.vm.$emit('node-drag-stop', {
            node: { ...dragged, position: { x: 145, y: 32 } },
        });
        await flushPromises();
        expect(updateSubjectLayout).toHaveBeenCalledWith('career', {
            subject_id: 'a', cycle: 1, position: 2,
        });

        flow.vm.$emit('node-click', {
            node: initialNodes.find((node) => node.id === 'add-subject-1'),
        });
        await nextTick();
        expect(wrapper.findComponent({ name: 'Dialog' }).props('open')).toBe(true);
    });
});
