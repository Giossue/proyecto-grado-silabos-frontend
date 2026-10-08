<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { provide } from "vue"
import { cn } from "@/lib/utils"
import { tableSectionKey } from "./context"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

provide(tableSectionKey, 'body')
</script>

<template>
  <tbody
    data-slot="table-body"
    role="rowgroup"
    :class="cn('[&_tr:last-child]:border-0', props.class)"
  >
    <slot />
  </tbody>
</template>
