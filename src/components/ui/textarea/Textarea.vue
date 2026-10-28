<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { useFieldControl } from "@/components/ui/field/fieldContext"

defineOptions({ inheritAttrs: false })
const control = useFieldControl()

const props = defineProps<{
  class?: HTMLAttributes["class"]
  defaultValue?: string | number
  modelValue?: string | number
}>()

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <textarea
    v-model="modelValue"
    v-bind="{ ...$attrs, ...control }"
    data-slot="textarea"
    :class="cn('border-border placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/30 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md border bg-field px-3 py-2 text-base shadow-control transition-[color,box-shadow] outline-hidden focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', props.class)"
  />
</template>
