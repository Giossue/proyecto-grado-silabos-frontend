<script setup lang="ts">
import type { RadioGroupItemProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { Circle } from "@lucide/vue"
import { reactiveOmit } from "@vueuse/core"
import { RadioGroupIndicator, RadioGroupItem, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<RadioGroupItemProps & {
  class?: HTMLAttributes["class"]
  variant?: "default" | "choice"
}>(), { variant: "default" })

const delegatedProps = reactiveOmit(props, "class", "variant")

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    v-bind="forwardedProps"
    :class="
      cn('peer border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/30 aria-invalid:border-destructive shrink-0 border shadow-control transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
         variant === 'choice'
           ? 'inline-flex h-8 items-center justify-center rounded-md bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground'
           : 'aspect-square size-4 rounded-full text-primary-readable data-[state=checked]:border-primary',
         props.class)"
  >
    <slot v-if="variant === 'choice'" />
    <RadioGroupIndicator
      v-else
      data-slot="radio-group-indicator"
      class="relative flex items-center justify-center"
    >
      <Circle class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>
