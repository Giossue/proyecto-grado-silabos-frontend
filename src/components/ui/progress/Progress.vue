<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { cva } from 'class-variance-authority';
import { ProgressIndicator, ProgressRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  modelValue?: number;
  max?: number;
  class?: HTMLAttributes['class'];
  tone?: 'default' | 'destructive' | 'warning' | 'success';
}>(), {
  modelValue: 0,
  max: 100,
  tone: 'default',
});

const maximum = computed(() => Math.max(1, props.max));
const value = computed(() => Math.min(maximum.value, Math.max(0, props.modelValue)));
const offset = computed(() => 100 - (value.value / maximum.value) * 100);
const indicatorVariants = cva('h-full w-full flex-1 transition-transform duration-300', {
  variants: { tone: { default: 'bg-primary', destructive: 'bg-destructive', warning: 'bg-warning', success: 'bg-success' } },
});
</script>

<template>
  <ProgressRoot
    :model-value="value"
    :max="maximum"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-muted', props.class)"
  >
    <ProgressIndicator
      :class="indicatorVariants({ tone })"
      :style="{ transform: `translateX(-${offset}%)` }"
    />
  </ProgressRoot>
</template>
