<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <td
    data-slot="table-cell"
    role="cell"
    :class="
      cn(
        'border-l border-border p-2 align-middle whitespace-normal break-words first:border-l-0 [&:has([role=checkbox])]:pr-0 *:[[role=checkbox]]:translate-y-0.5',
        props.class,
      )
    "
  >
    <slot />
  </td>
</template>
