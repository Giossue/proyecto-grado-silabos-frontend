<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "@lucide/vue"
import { Toaster as Sonner } from "vue-sonner"
import { cn } from "@/lib/utils"

import 'vue-sonner/style.css';

const props = withDefaults(defineProps<ToasterProps>(), {
  position: "top-center",
})
</script>

<template>
  <Sonner
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--foreground)',
      '--normal-text': 'var(--background)',
      '--normal-border': 'var(--foreground)',
      '--border-radius': 'var(--radius)',
    }"
    v-bind="props"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<style>
/* Cada aviso ocupa el espacio de su contenido y solo crece hasta el ancho disponible. */
.toaster[data-sonner-toaster] [data-sonner-toast] {
  width: max-content;
  max-width: min(32rem, calc(100vw - 2rem));
  min-width: 0;
}

@media (max-width: 600px) {
  .toaster[data-sonner-toaster] [data-sonner-toast] {
    width: fit-content;
    max-width: calc(100vw - 2rem);
  }
}
</style>
