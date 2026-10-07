<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import type { AlertVariants } from "."
import { cn } from "@/lib/utils"
import { alertVariants } from "."

const props = defineProps<{
  class?: HTMLAttributes["class"]
  variant?: AlertVariants["variant"]
  appearance?: AlertVariants["appearance"]
}>()
</script>

<template>
  <div
    data-slot="alert"
    :class="cn(alertVariants({ variant, appearance }), props.class)"
    role="alert"
  >
    <slot />
  </div>
</template>
