<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import { ref, type HTMLAttributes } from "vue"
import { X } from "@lucide/vue"
import { reactiveOmit } from "@vueuse/core"
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"
import SheetOverlay from "./SheetOverlay.vue"

interface SheetContentProps extends DialogContentProps {
  class?: HTMLAttributes["class"]
  hideClose?: boolean
  dismissable?: boolean
}

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SheetContentProps>(), {
  hideClose: true,
  dismissable: false,
})
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "hideClose", "dismissable")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const hasUnsavedChanges = ref(false)
const markChanged = (): void => {
  hasUnsavedChanges.value = true
}
const onEscapeKeyDown = (event: KeyboardEvent): void => {
  if (hasUnsavedChanges.value) {
    event.preventDefault()
  }
}

const preventImplicitDismiss = (event: Event): void => {
  if (!props.dismissable) event.preventDefault()
}
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      :class="cn(
        'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col gap-4 overflow-hidden rounded-lg ring-1 ring-surface-ring shadow-modal duration-200 sm:max-w-lg',
        props.class)"
      v-bind="{ ...$attrs, ...forwarded }"
      @escape-key-down="onEscapeKeyDown"
      @interact-outside="preventImplicitDismiss"
      @pointer-down-outside="preventImplicitDismiss"
    >
      <div class="contents" @input.capture="markChanged" @change.capture="markChanged">
        <slot />
      </div>

      <DialogClose
        v-if="!hideClose"
        class="focus-visible:ring-ring/50 focus-visible:ring-3 data-[state=open]:bg-secondary outline-hidden absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none"
      >
        <X class="size-4" />
        <span class="sr-only">Cerrar</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
