<script setup lang="ts">
import { fieldTypeKeys, fieldTypeRegistry } from '@/components/domain/fieldTypes/registry';
import { newFieldForm, type FieldForm } from '@/components/domain/configuration/templateStructure';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FieldTypeKey } from '@/types/configuration';

/** Formulario de un campo: tipo (del registro), nombre opcional y la configuración que aporta cada tipo. */
const props = defineProps<{ idPrefix: string; lockType?: boolean }>();
const form = defineModel<FieldForm>({ required: true });

const chooseType = (type: FieldTypeKey): void => {
    if (type === form.value.type) return;
    form.value = { ...newFieldForm(type), label: form.value.label, help: form.value.help };
};
</script>

<template>
  <FieldGroup>
    <FieldSet v-if="!lockType">
      <FieldLegend variant="label">¿Quién escribe este campo?</FieldLegend>
      <RadioGroup :model-value="form.type" class="gap-2" @update:model-value="chooseType($event as FieldTypeKey)">
        <label v-for="key in fieldTypeKeys" :key="key" :for="`${props.idPrefix}-type-${key}`" class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary">
          <RadioGroupItem :id="`${props.idPrefix}-type-${key}`" :value="key" class="mt-0.5" />
          <span class="flex flex-col gap-0.5 text-sm">
            <span class="font-medium">{{ fieldTypeRegistry[key].adminLabel }}</span>
            <span class="text-muted-foreground">{{ fieldTypeRegistry[key].adminHint }}</span>
          </span>
        </label>
      </RadioGroup>
    </FieldSet>
    <p v-else class="text-sm"><span class="font-medium">{{ fieldTypeRegistry[form.type].adminLabel }}</span>. El tipo no se puede cambiar; para otro tipo, cree un campo nuevo.</p>

    <Field>
      <FieldLabel :for="`${props.idPrefix}-label`">Nombre del campo (opcional)</FieldLabel>
      <Input :id="`${props.idPrefix}-label`" v-model="form.label" maxlength="180" placeholder="Ej. Descripción de la asignatura" />
      <FieldDescription>Si lo deja vacío, el campo no lleva subtítulo.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel :for="`${props.idPrefix}-help`">Ayuda para quien lo llena (opcional)</FieldLabel>
      <Input :id="`${props.idPrefix}-help`" v-model="form.help" maxlength="2000" />
    </Field>

    <FieldContent>
      <component :is="fieldTypeRegistry[form.type].BuilderComponent" :key="form.type" v-model="form.config" />
    </FieldContent>
  </FieldGroup>
</template>
