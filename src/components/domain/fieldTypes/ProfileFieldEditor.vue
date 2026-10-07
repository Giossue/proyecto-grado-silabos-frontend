<script setup lang="ts">
import { computed } from 'vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import TextFieldEditor from '@/components/domain/fieldTypes/TextFieldEditor.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import { Badge } from '@/components/ui/badge';
import type { TypedField } from '@/types/configuration';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<{ field: TypedField; modelValue: unknown; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();
const adjustable = computed(() => fieldConfig(props.field).adjustable === true);
</script>

<template>
  <TextFieldEditor v-if="adjustable" :field="field" :model-value="modelValue" :id="id" :disabled="disabled" @update:model-value="emit('update:modelValue', $event)" />
  <div v-else class="flex flex-col gap-2 rounded-md border bg-muted/30 p-4">
    <Badge variant="outline" class="w-fit">Heredado de la ficha de la asignatura</Badge>
    <FreeTextContent :value="modelValue" empty-text="Pendiente de Coordinación" />
  </div>
</template>
