<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import { computed, provide, ref, type HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import DialogCloseButton from "./DialogCloseButton.vue"
import DialogOverlay from "./DialogOverlay.vue"
import { dialogCloseKey } from "./closeContext"

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<DialogContentProps & {
  class?: HTMLAttributes["class"]
  overlayClass?: HTMLAttributes["class"]
  layer?: "default" | "confirmation"
  hideClose?: boolean
}>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "overlayClass", "layer", "hideClose")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const titles = ref(0)
provide(dialogCloseKey, { enabled: computed(() => !props.hideClose), titles })

// La X ahora va junto al título, antes que los campos: al abrir, el foco salta la X y va al primer control.
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
const onOpenAutoFocus = (event: Event): void => {
  const content = event.currentTarget instanceof HTMLElement ? event.currentTarget : null
  if (event.defaultPrevented || !content) return
  const first = [...content.querySelectorAll<HTMLElement>(FOCUSABLE)].find((element) =>
    element.dataset.slot !== "dialog-close-x" && !element.closest('[hidden], [inert], [aria-hidden="true"]'))
  if (!first) return
  event.preventDefault()
  first.focus({ preventScroll: true })
}

const preventImplicitDismiss = (event: Event): void => {
  event.preventDefault()
}

const hasUnsavedChanges = ref(false)
const markChanged = (): void => {
  hasUnsavedChanges.value = true
}
const onEscapeKeyDown = (event: KeyboardEvent): void => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
  }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay :class="cn(layer === 'confirmation' ? 'z-(--layer-confirmation)' : 'z-(--layer-modal)', props.overlayClass)" />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      @escape-key-down="onEscapeKeyDown"
      @open-auto-focus="onOpenAutoFocus"
      @interact-outside="preventImplicitDismiss"
      @pointer-down-outside="preventImplicitDismiss"
      :class="
        cn(
          'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid grid-cols-[minmax(0,1fr)] max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-md ring-1 ring-surface-ring p-6 shadow-modal duration-200 sm:max-w-lg',
          props.class,
          layer === 'confirmation' ? 'z-(--layer-confirmation)' : 'z-(--layer-modal)',
        )"
    >
      <div class="contents" @input.capture="markChanged" @change.capture="markChanged">
        <slot />
      </div>
      <DialogCloseButton v-if="!hideClose && titles === 0" class="top-4 right-4" />
    </DialogContent>
  </DialogPortal>
</template>
