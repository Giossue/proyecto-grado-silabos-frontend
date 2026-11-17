<script setup lang="ts">
import { computed, useId } from 'vue';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { conditionSourceKey as sourceKey, type ConditionChoice, type ConditionSource } from '@/lib/responseConditions';

const props = withDefaults(defineProps<{ sources: ConditionSource[]; disabled?: boolean; hint?: string }>(), { disabled: false, hint: '' });
const model = defineModel<ConditionChoice>({ required: true });
const id = useId();
const ALWAYS = 'siempre';

const selected = computed(() => props.sources.find((source) => sourceKey(source) === model.value.source) ?? null);
const chooseSource = (value: unknown): void => {
    model.value = { source: typeof value === 'string' && value !== ALWAYS ? value : '', options: [] };
};
const toggle = (option: string, checked: unknown): void => {
    const options = checked === true ? [...model.value.options, option] : model.value.options.filter((item) => item !== option);
    model.value = { ...model.value, options: selected.value ? selected.value.options.map((item) => item.const).filter((key) => options.includes(key)) : options };
};
</script>

<template>
  <Field data-condition-picker>
    <FieldLabel :for="`${id}-source`">Mostrar solo si</FieldLabel>
    <Select :model-value="model.source || ALWAYS" :disabled="disabled" @update:model-value="chooseSource">
      <SelectTrigger :id="`${id}-source`" data-condition-source><SelectValue placeholder="Siempre" /></SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem :value="ALWAYS">Siempre</SelectItem>
          <SelectItem v-for="source in sources" :key="sourceKey(source)" :value="sourceKey(source)">{{ source.label }}</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
    <FieldDescription v-if="hint && sources.length > 0" data-condition-hint>{{ hint }}</FieldDescription>
    <FieldDescription v-if="sources.length === 0">Ponga antes una respuesta de elegir una o varias para usarla aquí</FieldDescription>
    <div v-if="selected" class="flex flex-col gap-2 pt-1" role="group" :aria-label="`Opciones de ${selected.label}`">
      <span class="text-sm text-muted-foreground">si eligió alguna de:</span>
      <Field v-for="option in selected.options" :key="option.const" orientation="horizontal">
        <Checkbox :id="`${id}-${option.const}`" :model-value="model.options.includes(option.const)" :disabled="disabled" :data-condition-option="option.const" @update:model-value="toggle(option.const, $event)" />
        <FieldLabel :for="`${id}-${option.const}`" class="font-normal">{{ option.title }}</FieldLabel>
      </Field>
    </div>
  </Field>
</template>
