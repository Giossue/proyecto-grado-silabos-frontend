<script setup lang="ts">
import { ChevronDown, ChevronUp } from '@lucide/vue';
import type { CSSProperties } from 'vue';
import { ref } from 'vue';
import CurriculumLegend from '@/components/domain/academic/curriculum/CurriculumLegend.vue';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
} from '@/components/ui/collapsible';

defineProps<{
    units: { unit: string; style: CSSProperties }[];
    rows: { id: string; label: string; value: string }[];
}>();

const open = ref(true);
const contentId = 'curriculum-legend-content';
</script>

<template>
    <div
        :class="[
            'relative rounded-md bg-card/90 text-card-foreground shadow-surface ring-1 ring-surface-ring',
            open ? 'w-56' : 'size-8',
        ]"
    >
        <Collapsible v-model:open="open">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                class="absolute top-0.5 right-0.5 z-10 size-7"
                :aria-controls="contentId"
                :aria-expanded="open"
                :aria-label="open ? 'Contraer leyenda y totales' : 'Expandir leyenda y totales'"
                @click="open = !open"
            >
                <ChevronUp v-if="open" aria-hidden="true" />
                <ChevronDown v-else aria-hidden="true" />
            </Button>
            <CollapsibleContent :id="contentId" class="px-3 py-2 pr-10">
                <CurriculumLegend :units="units" :rows="rows" />
            </CollapsibleContent>
        </Collapsible>
    </div>
</template>
