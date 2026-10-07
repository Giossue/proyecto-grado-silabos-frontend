<script setup lang="ts">
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import type { TypedField } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ field: TypedField; modelValue: unknown; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();
const inputId = () => props.id ?? `input-${props.field.id ?? props.field.key}`;
</script>

<template>
  <FreeTextEditor :id="inputId()" :label="field.label" :disabled="disabled" :bullets-only="fieldConfig(field).optional === true" :model-value="isFreeTextDocument(modelValue) ? modelValue : null" @update:model-value="emit('update:modelValue', $event)" />
</template>
