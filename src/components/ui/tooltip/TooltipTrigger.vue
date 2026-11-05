<script setup lang="ts">
import type { TooltipTriggerProps } from "reka-ui"
import { TooltipTrigger } from "reka-ui"
import { inject, onBeforeUnmount, onMounted, ref } from "vue"
import { tooltipTouchKey } from "./touch"

const props = defineProps<TooltipTriggerProps>()

const HOLD_MS = 450
const SHOW_MS = 1600

const state = inject(tooltipTouchKey, null)
const trigger = ref<{ $el: HTMLElement } | null>(null)
let holdTimer: ReturnType<typeof setTimeout> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined
let longPressed = false

const dismiss = (): void => {
  clearTimeout(hideTimer)
  if (state) state.held.value = false
}

const onPointerDown = (event: PointerEvent): void => {
  if (!state?.touch.value || event.pointerType === "mouse") return
  longPressed = false
  clearTimeout(holdTimer)
  clearTimeout(hideTimer)
  holdTimer = setTimeout(() => {
    longPressed = true
    state.held.value = true
    document.addEventListener("pointerdown", dismiss, { once: true, capture: true })
  }, HOLD_MS)
}

const onPointerEnd = (): void => {
  clearTimeout(holdTimer)
  if (state?.held.value) hideTimer = setTimeout(dismiss, SHOW_MS)
}

const onClickCapture = (event: MouseEvent): void => {
  if (!longPressed) return
  longPressed = false
  event.preventDefault()
  event.stopPropagation()
}

const onContextMenu = (event: Event): void => {
  if (state?.touch.value) event.preventDefault()
}

onMounted(() => trigger.value?.$el.addEventListener("click", onClickCapture, true))

onBeforeUnmount(() => {
  trigger.value?.$el.removeEventListener("click", onClickCapture, true)
  clearTimeout(holdTimer)
  clearTimeout(hideTimer)
  document.removeEventListener("pointerdown", dismiss, { capture: true })
})
</script>

<template>
  <TooltipTrigger
    ref="trigger"
    data-slot="tooltip-trigger"
    v-bind="props"
    @pointerdown="onPointerDown"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
    @pointerleave="onPointerEnd"
    @contextmenu="onContextMenu"
  >
    <slot />
  </TooltipTrigger>
</template>
