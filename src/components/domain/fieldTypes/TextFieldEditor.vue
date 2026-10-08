<script setup lang="ts">
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { emptyBibliography, isBibliographyField } from '@/components/domain/fieldTypes/bibliographyTable';
import { freeTextPlain, isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import type { TypedField } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ field: TypedField; modelValue: unknown; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();
const inputId = () => props.id ?? `input-${props.field.id ?? props.field.key}`;
const bibliography = () => isBibliographyField(props.field.key);
const value = (): DocumentNode | null => {
  const current = isFreeTextDocument(props.modelValue) ? props.modelValue : null;
  if (bibliography() && (!current || (freeTextPlain(current).trim() === '' && !JSON.stringify(current).includes('"table"')))) return emptyBibliography();
  return current;
};
</script>

<template>
  <FreeTextEditor :id="inputId()" :label="field.label" :disabled="disabled" :bullets-only="fieldConfig(field).optional === true && !bibliography()" :model-value="value()" @update:model-value="emit('update:modelValue', $event)" />
</template>
