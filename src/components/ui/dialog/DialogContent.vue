<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import { X } from "@lucide/vue"
import { ref, type HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import DialogOverlay from "./DialogOverlay.vue"

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
      <DialogClose
        v-if="!hideClose"
        data-slot="dialog-close-x"
        class="focus-visible:ring-ring/50 focus-visible:ring-3 outline-hidden absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none"
      >
        <X class="size-4" aria-hidden="true" />
        <span class="sr-only">Cerrar</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
