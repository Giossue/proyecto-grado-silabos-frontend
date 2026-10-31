<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, useSlots } from "vue"
import { cn } from "@/lib/utils"
import { withoutEndPeriod } from "@/lib/text"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const slots = useSlots()
const plainText = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.length > 0 && nodes.every((node) => typeof node.children === "string")
    ? withoutEndPeriod(nodes.map((node) => node.children as string).join(""))
    : null
})
</script>

<template>
  <p
    data-slot="field-description"
    :class="cn(
      'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
      'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
      '[&>a:hover]:text-primary-readable [&>a]:underline [&>a]:underline-offset-4',
      props.class,
    )"
  >
    <template v-if="plainText !== null">{{ plainText }}</template>
    <slot v-else />
  </p>
</template>
