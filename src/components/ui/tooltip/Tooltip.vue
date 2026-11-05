<script setup lang="ts">
import type { TooltipRootEmits, TooltipRootProps } from "reka-ui"
import { useMediaQuery } from "@vueuse/core"
import { TooltipRoot, useForwardPropsEmits } from "reka-ui"
import { computed, provide, ref } from "vue"
import { tooltipTouchKey } from "./touch"

const props = defineProps<TooltipRootProps>()
const emits = defineEmits<TooltipRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
const touch = useMediaQuery("(hover: none) and (pointer: coarse)")
const held = ref(false)
provide(tooltipTouchKey, { touch, held })

const bound = computed(() => touch.value
  ? { ...forwarded.value, open: held.value, "onUpdate:open": () => undefined }
  : forwarded.value)
</script>

<template>
  <TooltipRoot
    v-slot="slotProps"
    data-slot="tooltip"
    v-bind="bound"
  >
    <slot v-bind="slotProps" />
  </TooltipRoot>
</template>
