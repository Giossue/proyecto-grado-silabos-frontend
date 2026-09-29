<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui"
import { ref, type HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
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
}>()
const emits = defineEmits<DialogContentEmits>()

const delegatedProps = reactiveOmit(props, "class", "overlayClass")

const forwarded = useForwardPropsEmits(delegatedProps, emits)

const preventImplicitDismiss = (event: Event): void => {
  event.preventDefault()
}

// Escape cierra el diálogo salvo que el usuario ya haya escrito o cambiado algo en él:
// así no se pierde trabajo sin guardar. El clic fuera nunca cierra.
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
    <DialogOverlay :class="props.overlayClass" />
    <DialogContent
      data-slot="dialog-content"
      v-bind="{ ...$attrs, ...forwarded }"
      @escape-key-down="onEscapeKeyDown"
      @interact-outside="preventImplicitDismiss"
      @pointer-down-outside="preventImplicitDismiss"
      :class="
        cn(
          'bg-card text-card-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-modal duration-200 sm:max-w-lg',
          props.class,
        )"
    >
      <div class="contents" @input.capture="markChanged" @change.capture="markChanged">
        <slot />
      </div>
    </DialogContent>
  </DialogPortal>
</template>
