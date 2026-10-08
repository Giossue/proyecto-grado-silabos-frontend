<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, provide, useAttrs, useId } from "vue"
import type { FieldVariants } from "."
import { cn } from "@/lib/utils"
import { fieldVariants } from "."
import { fieldContextKey } from "./fieldContext"

const props = defineProps<{
  class?: HTMLAttributes["class"]
  orientation?: FieldVariants["orientation"]
}>()

const attrs = useAttrs()
const invalid = computed(() => attrs["data-invalid"] === true || attrs["data-invalid"] === "true")
provide(fieldContextKey, { errorId: `field-error-${useId()}`, invalid })
</script>

<template>
  <div
    role="group"
    data-slot="field"
    :data-orientation="orientation"
    :class="cn(
      fieldVariants({ orientation }),
      props.class,
    )"
  >
    <slot />
  </div>
</template>

