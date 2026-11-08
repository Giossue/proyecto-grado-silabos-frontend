<script setup lang="ts">
import type { DialogTitleProps } from "reka-ui"
import { inject, onBeforeUnmount, type HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogTitle, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"
import DialogCloseButton from "./DialogCloseButton.vue"
import { dialogCloseKey } from "./closeContext"

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<DialogTitleProps & {
  class?: HTMLAttributes["class"]
  /** false en títulos ocultos (sr-only): la X vuelve a la esquina del modal. */
  close?: boolean
}>(), { close: true })

const delegatedProps = reactiveOmit(props, "class", "close")

const forwardedProps = useForwardProps(delegatedProps)

// La X va en la misma línea del título, sea cual sea el relleno del modal.
const context = inject(dialogCloseKey, null)
const ownsClose = Boolean(context && props.close)
if (context && ownsClose) {
  context.titles.value += 1
  onBeforeUnmount(() => { context.titles.value -= 1 })
}
</script>

<template>
  <div v-if="ownsClose" data-slot="dialog-title-row" class="relative w-full self-stretch">
    <DialogTitle
      data-slot="dialog-title"
      v-bind="{ ...$attrs, ...forwardedProps }"
      :class="cn('px-8 text-lg leading-none font-semibold', props.class)"
    >
      <slot />
    </DialogTitle>
    <DialogCloseButton v-if="context?.enabled.value" class="top-1/2 -right-2 -translate-y-1/2" />
  </div>
  <DialogTitle
    v-else
    data-slot="dialog-title"
    v-bind="{ ...$attrs, ...forwardedProps }"
    :class="cn('px-8 text-lg leading-none font-semibold', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
