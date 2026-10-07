<script setup lang="ts">
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';

const props = defineProps<{ modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>();
</script>

<template>
  <Field orientation="horizontal">
    <Checkbox id="field-config-adjustable" :model-value="props.modelValue.adjustable === true" @update:model-value="emit('update:modelValue', { ...props.modelValue, adjustable: $event === true })" />
    <FieldContent>
      <FieldLabel for="field-config-adjustable">El docente puede ajustarlo</FieldLabel>
      <FieldDescription>Coordinación lo escribe una vez en la ficha de la asignatura. Si lo marca, el docente puede cambiarlo en su sílabo.</FieldDescription>
    </FieldContent>
  </Field>
</template>
