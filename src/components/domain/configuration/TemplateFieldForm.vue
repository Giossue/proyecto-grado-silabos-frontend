<script setup lang="ts">
import type { FieldForm } from '@/components/domain/configuration/templateStructure';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FIELD_RESPONSIBLES, type FieldResponsible } from '@/types/configuration';
import type { TemplateVariable } from '@/lib/templateDocument';

const props = defineProps<{ idPrefix: string; variables?: TemplateVariable[] }>();
const form = defineModel<FieldForm>({ required: true });
</script>

<template>
  <FieldGroup>
    <FieldSet>
      <FieldLegend variant="label">¿Quién llena este campo?</FieldLegend>
      <RadioGroup :model-value="form.quien_llena" class="gap-2" @update:model-value="form.quien_llena = $event as FieldResponsible">
        <label v-for="item in FIELD_RESPONSIBLES" :key="item.value" :for="`${props.idPrefix}-responsible-${item.value}`" class="flex cursor-pointer items-start gap-3 rounded-md border p-3 has-[[data-state=checked]]:border-primary">
          <RadioGroupItem :id="`${props.idPrefix}-responsible-${item.value}`" :value="item.value" class="mt-0.5" />
          <span class="flex flex-col gap-0.5 text-sm"><span class="font-medium">{{ item.label }}</span><span class="text-muted-foreground">{{ item.hint }}</span></span>
        </label>
      </RadioGroup>
    </FieldSet>
    <Field>
      <FieldLabel :for="`${props.idPrefix}-label`">Nombre del campo (opcional)</FieldLabel>
      <Input :id="`${props.idPrefix}-label`" v-model="form.label" maxlength="180" placeholder="Ej. Descripción de la asignatura" />
      <FieldDescription>Si lo deja vacío, el campo no lleva subtítulo.</FieldDescription>
    </Field>
    <Field>
      <FieldLabel :for="`${props.idPrefix}-help`">Ayuda para quien lo llena (opcional)</FieldLabel>
      <Input :id="`${props.idPrefix}-help`" v-model="form.help" maxlength="2000" />
    </Field>
    <Field>
      <FieldLabel :for="`${props.idPrefix}-content`">Contenido inicial</FieldLabel>
      <FreeTextEditor :id="`${props.idPrefix}-content`" v-model="form.content" label="Contenido inicial" :variables="variables" />
    </Field>
  </FieldGroup>
</template>
