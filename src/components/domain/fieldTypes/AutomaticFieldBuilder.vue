<script setup lang="ts">
import { AUTOMATIC_SOURCES } from '@/components/domain/fieldTypes/builderConfig';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

const props = defineProps<{ modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>();
</script>

<template>
  <Field>
    <FieldLabel for="field-config-source">Dato que se completa solo</FieldLabel>
    <NativeSelect id="field-config-source" class="w-full" :model-value="String(props.modelValue.source ?? '')" @update:model-value="emit('update:modelValue', { ...props.modelValue, source: String($event) })">
      <NativeSelectOption v-for="source in AUTOMATIC_SOURCES" :key="source.value" :value="source.value">{{ source.label }}</NativeSelectOption>
    </NativeSelect>
    <FieldDescription>Nadie lo escribe: se toma de los datos de la asignatura al enviar el sílabo.</FieldDescription>
  </Field>
</template>
