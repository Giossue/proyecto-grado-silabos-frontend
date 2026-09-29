<script setup lang="ts">
import { computed } from 'vue';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Forma de una parte (I-155). Quién llena cada cosa ya no se pregunta aquí: se marca
 * en la hoja con un dato automático, !Docente o @ProyectoCarrera.
 */
const props = withDefaults(defineProps<{
    id: string;
    forms: { value: string; label: string }[];
    disabled?: boolean;
    error?: string;
    /** Una parte existente conserva su forma aunque ya no se ofrezca. */
    currentLabel?: string;
}>(), { disabled: false, error: undefined, currentLabel: undefined });

const model = defineModel<string>({ required: true });
const options = computed(() => props.forms.some((form) => form.value === model.value) || !props.currentLabel
    ? props.forms
    : [...props.forms, { value: model.value, label: props.currentLabel }]);
</script>

<template>
    <Field :data-invalid="Boolean(error) || undefined">
        <FieldLabel :for="id">¿Qué forma tiene?</FieldLabel>
        <Select v-model="model" :disabled="disabled">
            <SelectTrigger :id="id" class="w-full"><SelectValue placeholder="Elija una forma" /></SelectTrigger>
            <SelectContent><SelectGroup>
                <SelectItem v-for="form in options" :key="form.value" :value="form.value">{{ form.label }}</SelectItem>
            </SelectGroup></SelectContent>
        </Select>
        <FieldDescription>
            Lo que escriba en la hoja es fijo. Con Insertar marca lo que llena el docente o lo que viene del Proyecto de carrera.
        </FieldDescription>
        <FieldError :errors="[error]" />
    </Field>
</template>
