<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { nextTick, onMounted, ref, watch } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const props = defineProps<{ modelValue: string; label: string; maxlength?: number; disabled?: boolean; placeholder?: string; class?: HTMLAttributes['class'] }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; blur: [] }>();

const area = ref<{ $el: HTMLTextAreaElement } | null>(null);
const sizesItself = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
const fit = (): void => {
    const element = area.value?.$el;
    if (sizesItself || !element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
};
const update = (value: string | number): void => {
    emit('update:modelValue', String(value).replace(/\s*\n\s*/g, ' '));
    void nextTick(fit);
};
const finish = (event: KeyboardEvent): void => {
    event.preventDefault();
    (event.target as HTMLElement).blur();
};
onMounted(fit);
watch(() => props.modelValue, () => void nextTick(fit));
defineExpose({ focus: () => { area.value?.$el.focus(); area.value?.$el.select(); } });
</script>

<template>
  <Textarea
    ref="area"
    :model-value="modelValue"
    :maxlength="maxlength"
    :disabled="disabled"
    :placeholder="placeholder"
    :aria-label="label"
    rows="1"
    :class="cn('block h-auto min-h-0 w-full resize-none overflow-hidden rounded-none border-0 bg-transparent p-0 text-[length:inherit] leading-[inherit] shadow-none [font-weight:inherit] [letter-spacing:inherit] focus-visible:ring-0 disabled:cursor-default disabled:opacity-100 md:text-[length:inherit]', props.class)"
    @update:model-value="update"
    @keydown.enter="finish"
    @blur="emit('blur')"
  />
</template>
