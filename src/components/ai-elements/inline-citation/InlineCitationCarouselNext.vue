<script setup lang="ts">
import { ArrowRight } from '@lucide/vue';
import type { HTMLAttributes } from 'vue';
import { useCarousel } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const { scrollNext, canScrollNext } = useCarousel();
</script>

<template>
    <Button variant="ghost" size="icon-sm"
        :class="cn('shrink-0', props.class)"
        type="button"
        aria-label="Siguiente"
        :disabled="!canScrollNext" @click="scrollNext"
    >
        <ArrowRight data-icon="inline-start" aria-hidden="true" />
    </Button>
</template>
