<script setup lang="ts">
import { Maximize } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ZOOM_LEVELS, type ZoomChoice } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';

defineProps<{ choice: ZoomChoice }>();
const emit = defineEmits<{ 'update:choice': [choice: ZoomChoice] }>();
</script>

<template>
    <div class="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
        <div class="flex items-center gap-1 rounded-md bg-card p-1 shadow-surface ring-1 ring-surface-ring" role="group" aria-label="Zoom de la malla">
            <Tooltip><TooltipTrigger as-child>
                <Button type="button" :variant="choice === 'fit' ? 'secondary' : 'ghost'" size="sm" :aria-pressed="choice === 'fit'" @click="emit('update:choice', 'fit')"><Maximize data-icon="inline-start" aria-hidden="true" />Ajustar</Button>
            </TooltipTrigger><TooltipContent>Ajustar la malla al ancho disponible</TooltipContent></Tooltip>
            <Button v-for="level in ZOOM_LEVELS" :key="level" type="button" :variant="choice === level ? 'secondary' : 'ghost'" size="sm" :aria-pressed="choice === level" :aria-label="`Ver la malla al ${level * 100} %`" @click="emit('update:choice', level)">{{ level * 100 }} %</Button>
        </div>
        <p class="rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground ring-1 ring-surface-ring max-sm:hidden">Use la rueda o las barras para moverse · Mayús + rueda para ir a los lados</p>
    </div>
</template>
