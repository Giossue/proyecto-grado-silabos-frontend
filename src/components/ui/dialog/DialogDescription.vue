<script setup lang="ts">
import type { DialogDescriptionProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { computed, useSlots } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { DialogDescription, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"
import { withoutEndPeriod } from "@/lib/text"

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class")

const forwardedProps = useForwardProps(delegatedProps)
const slots = useSlots()
const plainText = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.length > 0 && nodes.every((node) => typeof node.children === "string")
    ? withoutEndPeriod(nodes.map((node) => node.children as string).join(""))
    : null
})
</script>

<template>
  <DialogDescription
    data-slot="dialog-description"
    v-bind="forwardedProps"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <template v-if="plainText !== null">{{ plainText }}</template>
    <slot v-else />
  </DialogDescription>
</template>

