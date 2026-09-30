<script setup lang="ts">
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

defineProps<{
    modelValue?: string;
    options: Array<{ value: string; label: string }>;
    label: string;
    disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const update = (value: unknown): void => {
    if (typeof value === 'string') emit('update:modelValue', value);
};
</script>

<template>
    <RadioGroup :model-value="modelValue" :aria-label="label" :disabled="disabled" orientation="horizontal" class="flex flex-wrap gap-2" @update:model-value="update">
        <RadioGroupItem v-for="option in options" :key="option.value" :value="option.value" variant="choice">{{ option.label }}</RadioGroupItem>
    </RadioGroup>
</template>
