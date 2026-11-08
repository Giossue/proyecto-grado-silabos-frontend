<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue';
import { useVueFlow } from '@vue-flow/core';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const props = defineProps<{ flowId: string; minZoom: number; maxZoom: number }>();
const { viewport, zoomIn, zoomOut } = useVueFlow(props.flowId);
</script>

<template>
    <div class="absolute top-3 left-3 z-10 flex items-start gap-2">
    <div class="flex flex-col gap-1" role="group" aria-label="Zoom de la malla">
        <Tooltip><TooltipTrigger as-child><Button type="button" variant="outline" size="icon-sm" aria-label="Acercar la malla" :disabled="viewport.zoom >= maxZoom" @click="zoomIn()"><Plus aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Acercar la malla</TooltipContent></Tooltip>
        <Tooltip><TooltipTrigger as-child><Button type="button" variant="outline" size="icon-sm" aria-label="Alejar la malla" :disabled="viewport.zoom <= minZoom" @click="zoomOut()"><Minus aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>Alejar la malla</TooltipContent></Tooltip>
    </div>
    <p class="rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground ring-1 ring-surface-ring max-sm:hidden">Arrastre el fondo o use la rueda para moverse · Ctrl + rueda para acercar</p>
    </div>
</template>
