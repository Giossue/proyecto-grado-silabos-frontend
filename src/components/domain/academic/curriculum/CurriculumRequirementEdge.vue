<script setup lang="ts">
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    useVueFlow,
} from '@vue-flow/core';
import type { EdgeProps } from '@vue-flow/core';
import { computed, ref } from 'vue';

const props = defineProps<
    EdgeProps<{
        label: string;
        sourceOffset: number;
        targetOffset: number;
        sameLevel: boolean;
        targetShared: boolean;
    }>
>();

const OVERPASS_RISE = 18;

const { screenToFlowCoordinate } = useVueFlow();

const ALIGNMENT_TOLERANCE = 24;

const endpoints = computed(() => {
    const sourceX = props.sourceX + props.data.sourceOffset;
    const targetX = props.targetX + props.data.targetOffset;

    const alignable =
        !props.data.targetShared &&
        Math.abs(sourceX - targetX) <= ALIGNMENT_TOLERANCE;

    return alignable ? { sourceX, targetX: sourceX } : { sourceX, targetX };
});

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

    const [path, labelX, labelY] = getSmoothStepPath({
        sourceX: endpoints.value.sourceX,
        sourceY: props.sourceY,
        sourcePosition: props.sourcePosition,
        targetX: endpoints.value.targetX,
        targetY: props.targetY,
        targetPosition: props.targetPosition,
    });

    return [path, labelX, labelY];
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
        class="cursor-pointer focus:outline-none"
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
            class="pointer-events-none absolute z-10 rounded-md bg-card px-2 py-1 text-[10px] text-card-foreground shadow-menu ring-1 ring-surface-ring"
            :style="{
                transform: `translate(-50%, -150%) translate(${hoverPoint.x}px, ${hoverPoint.y}px)`,
            }"
        >
            {{ data.label }}
        </div>
    </EdgeLabelRenderer>
</template>

