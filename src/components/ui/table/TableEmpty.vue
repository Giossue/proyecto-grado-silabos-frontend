<script setup lang="ts">
import { Inbox } from "@lucide/vue"
import { computed, useSlots, type HTMLAttributes } from "vue"
import { withoutEndPeriod } from "@/lib/text"
import { reactiveOmit } from "@vueuse/core"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import TableCell from "./TableCell.vue"
import TableRow from "./TableRow.vue"

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  colspan?: number
}>(), {
  colspan: 1,
})

const delegatedProps = reactiveOmit(props, "class")
const slots = useSlots()
const plainText = computed(() => {
  const nodes = slots.default?.() ?? []
  return nodes.length > 0 && nodes.every((node) => typeof node.children === "string")
    ? withoutEndPeriod(nodes.map((node) => node.children as string).join(""))
    : null
})
</script>

<template>
  <TableRow>
    <TableCell
      :class="
        cn(
          'h-40 p-0 whitespace-normal align-middle',
          props.class,
        )
      "
      v-bind="delegatedProps"
    >
      <Empty class="gap-3 rounded-none border-0 p-6 md:p-10">
        <EmptyHeader class="gap-3">
          <EmptyMedia class="text-muted-foreground [&_svg]:size-6">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle class="text-sm font-normal text-muted-foreground">
            <template v-if="plainText !== null">{{ plainText }}</template>
            <slot v-else />
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    </TableCell>
  </TableRow>
</template>

