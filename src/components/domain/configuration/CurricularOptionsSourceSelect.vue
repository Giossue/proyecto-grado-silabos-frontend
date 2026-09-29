<script setup lang="ts">
import { computed } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import type { TemplateVariable } from '@/lib/templateDocument';

const props = withDefaults(defineProps<{ id: string; variables?: TemplateVariable[]; disabled?: boolean; manual?: boolean; label?: string }>(), { variables: () => [], disabled: false, manual: false, label: 'Listas para las opciones' });
const model = defineModel<string[]>({ default: () => [] });
const lists = computed(() => props.variables.filter((variable) => variable.type === 'lista'));
const choose = (key: string, checked: boolean | 'indeterminate') => { model.value = checked === true ? [...new Set([...model.value, key])] : model.value.filter((value) => value !== key); };
</script>
<template>
  <FieldSet :disabled="disabled">
    <FieldLegend :required="!manual">{{ label }}</FieldLegend>
    <FieldGroup v-if="lists.length" class="max-h-48 gap-3 overflow-y-auto">
      <Field v-for="list in lists" :key="list.key" orientation="horizontal">
        <Checkbox :id="`${id}-${list.key}`" :model-value="model.includes(list.key)" :disabled="disabled" @update:model-value="choose(list.key, $event)" />
        <FieldLabel :for="`${id}-${list.key}`">{{ list.label }}</FieldLabel>
      </Field>
    </FieldGroup>
    <FieldDescription>{{ lists.length ? 'Puedes unir varias listas; cada sílabo ofrece las opciones validadas para su carrera y asignatura, sin repetirlas.' : 'Coordinación debe importar y validar una lista curricular antes de vincularla aquí.' }}{{ manual ? ' Sin listas seleccionadas se usan las opciones escritas en la plantilla.' : '' }}</FieldDescription>
  </FieldSet>
</template>
