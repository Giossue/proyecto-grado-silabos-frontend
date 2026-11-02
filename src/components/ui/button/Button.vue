<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "."
import { Primitive } from "reka-ui"
import { computed, ref, useAttrs } from "vue"
import { useFormIncomplete } from "@/composables/useFormIncomplete"
import { cn } from "@/lib/utils"
import { buttonVariants } from "."

defineOptions({ inheritAttrs: false })

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
})

const attrs = useAttrs()
const primitive = ref<{ $el: HTMLElement } | null>(null)
const element = computed(() => primitive.value?.$el ?? null)
// Dentro de un modal, el botón de enviar queda deshabilitado mientras falte un campo obligatorio.
const incomplete = useFormIncomplete(element)
const disabled = computed(() => (attrs.disabled !== undefined && attrs.disabled !== false) || incomplete.value)
</script>

<template>
  <Primitive
    ref="primitive"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    v-bind="attrs"
    :disabled="disabled || undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
