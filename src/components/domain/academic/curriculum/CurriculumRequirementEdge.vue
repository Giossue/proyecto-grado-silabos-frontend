<script setup lang="ts">
import { BaseEdge, EdgeLabelRenderer, useVueFlow } from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';
import { computed, ref } from 'vue';
import {
    laneHeight,
    subjectHeight,
} from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

const props = defineProps<
    EdgeProps<{
        label: string;
        sourceOffset: number;
        targetOffset: number;
        sameLevel: boolean;
        channelIndex: number;
        channelCount: number;
    }>
>();

const OVERPASS_RISE = 18;
// Hueco vertical entre la base de una tarjeta y la cima de la del nivel siguiente.
const LEVEL_GAP = laneHeight - subjectHeight;
const CHANNEL_MARGIN = 12;

const { screenToFlowCoordinate } = useVueFlow();

const endpoints = computed(() => ({
    sourceX: props.sourceX + props.data.sourceOffset,
    targetX: props.targetX + props.data.targetOffset,
}));

const pathData = computed((): [string, number, number] => {
    if (props.data.sameLevel) {
        const top = props.targetY;
        const rise = top - OVERPASS_RISE;
        const sourceX = props.sourceX + props.data.sourceOffset;
        const targetX = props.targetX + props.data.targetOffset;

        return [
            `M ${sourceX} ${top} V ${rise} H ${targetX} V ${top}`,
            (sourceX + targetX) / 2,
            rise,
        ];
    }

    const { sourceX, targetX } = endpoints.value;
    if (Math.abs(sourceX - targetX) < 0.5) {
        return [
            `M ${sourceX} ${props.sourceY} V ${props.targetY}`,
            sourceX,
            (props.sourceY + props.targetY) / 2,
        ];
    }

    // Tramo horizontal en su propio carril del hueco que precede a la materia destino.
    const usable = LEVEL_GAP - CHANNEL_MARGIN * 2;
    const step = usable / (props.data.channelCount + 1);
    const channelY =
        props.targetY - LEVEL_GAP + CHANNEL_MARGIN + step * (props.data.channelIndex + 1);

    return [
        `M ${sourceX} ${props.sourceY} V ${channelY} H ${targetX} V ${props.targetY}`,
        (sourceX + targetX) / 2,
        channelY,
    ];
});
const path = computed(() => pathData.value[0]);

const hoverPoint = ref<{ x: number; y: number } | null>(null);

const onHoverMove = (event: MouseEvent): void => {
    hoverPoint.value = screenToFlowCoordinate({
        x: event.clientX,
        y: event.clientY,
    });
};

const onFocusIn = (): void => {
    hoverPoint.value = { x: pathData.value[1], y: pathData.value[2] };
};
</script>

<template>
    <g
        class="cursor-pointer focus:outline-hidden"
        @mouseenter="onHoverMove"
        @mousemove="onHoverMove"
        @mouseleave="hoverPoint = null"
        @focusin="onFocusIn"
        @focusout="hoverPoint = null"
    >
        <BaseEdge
            :id="id"
            :path="path"
            :style="style"
            :marker-end="markerEnd"
            :marker-start="markerStart"
            :interaction-width="24"
        />
    </g>
    <EdgeLabelRenderer>
        <div
            v-if="hoverPoint"
            class="pointer-events-none absolute z-10 rounded-md bg-card px-2 py-1 text-curriculum-edge text-card-foreground shadow-menu ring-1 ring-surface-ring"
            :style="{
                transform: `translate(-50%, -150%) translate(${hoverPoint.x}px, ${hoverPoint.y}px)`,
            }"
        >
            {{ data.label }}
        </div>
    </EdgeLabelRenderer>
</template>

