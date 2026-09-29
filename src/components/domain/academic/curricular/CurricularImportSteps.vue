<script setup lang="ts">
import { Check } from '@lucide/vue';
import { cn } from '@/lib/utils';

const props = withDefaults(defineProps<{ current: 1 | 2 | 3 | 4; failed?: boolean }>(), { failed: false });
const STEPS = ['Documentos', 'Análisis', 'Revisión', 'Listo'] as const;
const state = (index: number): 'done' | 'current' | 'pending' => {
  const step = index + 1;
  if (step < props.current || (step === 4 && props.current === 4)) return 'done';
  return step === props.current ? 'current' : 'pending';
};
</script>

<template>
  <nav aria-label="Pasos de la importación">
    <ol class="flex items-center gap-2">
      <li
        v-for="(title, index) in STEPS"
        :key="title"
        class="flex min-w-0 items-center gap-2 not-last:flex-1"
        :aria-current="index + 1 === current ? 'step' : undefined"
      >
        <span
          :class="cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium',
            state(index) === 'done' && 'border-primary bg-primary text-primary-foreground',
            state(index) === 'current' && (failed ? 'border-2 border-destructive text-destructive' : 'border-2 border-primary text-primary'),
            state(index) === 'pending' && 'text-muted-foreground',
          )"
        >
          <Check v-if="state(index) === 'done'" class="size-3.5" aria-hidden="true" />
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span
          :class="cn(
            'truncate text-sm',
            state(index) === 'pending' ? 'text-muted-foreground' : 'font-medium',
            index + 1 !== current && 'max-sm:sr-only',
          )"
        >{{ title }}<span class="sr-only">{{ state(index) === 'done' ? ' (completado)' : state(index) === 'current' ? (failed ? ' (con error)' : ' (actual)') : '' }}</span></span>
        <span v-if="index < STEPS.length - 1" class="h-px min-w-4 flex-1 bg-border" aria-hidden="true" />
      </li>
    </ol>
  </nav>
</template>
