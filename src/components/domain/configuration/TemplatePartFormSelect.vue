<script setup lang="ts">
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Forma de una parte (I-155). Quién llena cada cosa ya no se pregunta aquí: se marca
 * en la hoja con un dato automático, !Docente o @ProyectoCarrera.
 */
withDefaults(defineProps<{
    id: string;
    forms: { value: string; label: string }[];
    disabled?: boolean;
    error?: string;
}>(), { disabled: false, error: undefined });

const model = defineModel<string>({ required: true });
</script>

<template>
    <Field :data-invalid="Boolean(error) || undefined">
        <FieldLabel :for="id">¿Qué forma tiene?</FieldLabel>
        <Select v-model="model" :disabled="disabled">
            <SelectTrigger :id="id" class="w-full"><SelectValue placeholder="Elija una forma" /></SelectTrigger>
            <SelectContent><SelectGroup>
                <SelectItem v-for="form in forms" :key="form.value" :value="form.value">{{ form.label }}</SelectItem>
            </SelectGroup></SelectContent>
        </Select>
        <FieldDescription>
            Lo que escriba en la hoja es fijo. Con Insertar marca lo que llena el docente o lo que viene del Proyecto de carrera.
        </FieldDescription>
        <FieldError :errors="[error]" />
    </Field>
</template>
