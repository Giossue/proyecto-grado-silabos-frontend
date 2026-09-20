<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { ProgressIndicator, ProgressRoot } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{
  modelValue?: number;
  max?: number;
  class?: HTMLAttributes['class'];
}>(), {
  modelValue: 0,
  max: 100,
});

const value = computed(() => Math.min(props.max, Math.max(0, props.modelValue)));
const offset = computed(() => 100 - (value.value / props.max) * 100);
</script>

<template>
  <ProgressRoot
    :model-value="value"
    :max="props.max"
    :class="cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', props.class)"
  >
    <ProgressIndicator
      class="h-full w-full flex-1 bg-primary transition-transform duration-300"
      :style="{ transform: `translateX(-${offset}%)` }"
    />
  </ProgressRoot>
</template>
