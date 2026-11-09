<script setup lang="ts">
import { computed } from 'vue';
import { ControlButton } from '@vue-flow/controls';
import '@vue-flow/controls/dist/style.css';
import { ZOOM_LEVELS, type ZoomChoice } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

// Los botones de zoom de Vue Flow (mismo aspecto e íconos), con nombres en español. Acercar y alejar
// pasan al nivel fijo siguiente o anterior; Ajustar vuelve al ancho disponible.
const props = defineProps<{ choice: ZoomChoice; zoom: number }>();
const emit = defineEmits<{ 'update:choice': [choice: ZoomChoice] }>();

const larger = computed(() => ZOOM_LEVELS.find((level) => level > props.zoom + 0.001) ?? null);
const smaller = computed(() => [...ZOOM_LEVELS].reverse().find((level) => level < props.zoom - 0.001) ?? null);
</script>

<template>
    <div class="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div class="vue-flow__controls flex [&>button]:border-r [&>button]:border-b-0 [&>button]:border-border [&>button:disabled]:opacity-40" role="group" aria-label="Zoom de la malla">
            <ControlButton title="Acercar" aria-label="Acercar la malla" :disabled="larger === null" @click="larger !== null && emit('update:choice', larger)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true"><path d="M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" /></svg>
            </ControlButton>
            <ControlButton title="Alejar" aria-label="Alejar la malla" :disabled="smaller === null" @click="smaller !== null && emit('update:choice', smaller)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 5" aria-hidden="true"><path d="M0 0h32v4.2H0z" /></svg>
            </ControlButton>
            <ControlButton title="Ajustar al ancho" aria-label="Ajustar la malla al ancho disponible" :aria-pressed="choice === 'fit'" @click="emit('update:choice', 'fit')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 30" aria-hidden="true"><path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0 0 27.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94a.919.919 0 0 1-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" /></svg>
            </ControlButton>
        </div>
        <p class="rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground ring-1 ring-surface-ring max-sm:hidden">Use la rueda o las barras para moverse · Mayús + rueda para ir a los lados</p>
    </div>
</template>
