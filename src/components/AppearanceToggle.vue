<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppearance } from '@/composables/useAppearance';
const { appearance, updateAppearance } = useAppearance();
const options = [{ value: 'light', Icon: Sun, label: 'Claro' }, { value: 'dark', Icon: Moon, label: 'Oscuro' }] as const;
const currentIndex = computed(() => Math.max(0, options.findIndex((option) => option.value === appearance.value)));
const current = computed(() => options[currentIndex.value]);
const next = computed(() => options[(currentIndex.value + 1) % options.length]);
</script>
<template>
  <TooltipProvider><Tooltip><TooltipTrigger as-child>
    <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Tema visual: ${current.label}. Cambiar a ${next.label}`" @click="updateAppearance(next.value)">
      <component :is="current.Icon" data-icon="inline-start" aria-hidden="true" />
    </Button>
  </TooltipTrigger><TooltipContent>Tema: {{ current.label }}</TooltipContent></Tooltip></TooltipProvider>
</template>
