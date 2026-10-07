<script setup lang="ts">
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>();
</script>

<template>
  <Field>
    <FieldLabel for="field-config-content">Texto que verán todos los sílabos</FieldLabel>
    <FreeTextEditor id="field-config-content" label="Texto fijo" :bullets-only="false" :model-value="(props.modelValue.content as DocumentNode | undefined) ?? null" @update:model-value="emit('update:modelValue', { ...props.modelValue, content: $event })" />
    <FieldDescription>Es igual para todos y el docente no lo puede cambiar. No puede quedar vacío.</FieldDescription>
  </Field>
</template>
