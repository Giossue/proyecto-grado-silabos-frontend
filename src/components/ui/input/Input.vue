<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, ref } from "vue"
import { useVModel } from "@vueuse/core"
import { Search } from "@lucide/vue"
import { cn } from "@/lib/utils"
import { useFieldControl } from "@/components/ui/field/fieldContext"

defineOptions({ inheritAttrs: false })
const control = useFieldControl()

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes["class"]
  type?: string
}>()

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
const input = ref<HTMLInputElement | null>(null)
const classes = computed(() => cn(
  'file:text-foreground placeholder:text-muted-foreground border-input h-9 w-full min-w-0 rounded-md border bg-field px-3 py-1 text-base shadow-control transition-[color,box-shadow] outline-hidden file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
  'aria-invalid:ring-destructive/30 aria-invalid:border-destructive',
  '[&::-webkit-search-cancel-button]:appearance-none',
  // Los buscadores llevan la lupa al inicio; el texto empieza después de ella.
  props.type === 'search' && 'pl-9',
  props.class,
))
defineExpose({ clear: () => { if (input.value) input.value.value = '' } })
</script>

<template>
  <input
    v-if="type === 'file'"
    ref="input"
    type="file"
    data-slot="input"
    :class="classes"
    v-bind="{ ...$attrs, ...control }"
  >
  <div v-else-if="type === 'search'" class="relative w-full min-w-0">
    <Search
      class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      aria-hidden="true"
    />
    <input
      v-model="modelValue"
      type="search"
      data-slot="input"
      :class="classes"
      v-bind="{ ...$attrs, ...control }"
    >
  </div>
  <input
    v-else
    v-model="modelValue"
    :type="type"
    data-slot="input"
    :class="classes"
    v-bind="{ ...$attrs, ...control }"
  >
</template>
