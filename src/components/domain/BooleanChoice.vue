<script setup lang="ts">
import { computed } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';

const props = defineProps<{ modelValue: boolean | null; label: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
const selected = computed(() => props.modelValue === null ? undefined : String(props.modelValue));
const options = [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }];
const update = (value: unknown): void => {
    if (value === 'true' || value === 'false') emit('update:modelValue', value === 'true');
};
</script>

<template>
    <ChoiceGroup
        :model-value="selected"
        :label="label"
        :options="options"
        :disabled="disabled"
        @update:model-value="update"
    />
</template>
