<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue';
import type { HTMLAttributes } from 'vue';
import { useCarousel } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const { scrollPrev, canScrollPrev } = useCarousel();
</script>

<template>
    <Button variant="ghost" size="icon-sm"
        :class="cn('shrink-0', props.class)"
        type="button"
        aria-label="Anterior"
        :disabled="!canScrollPrev" @click="scrollPrev"
    >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
    </Button>
</template>
