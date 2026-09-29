<script setup lang="ts">
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Forma de una parte nueva (I-156): Texto libre del docente o Contenido de la plantilla
 * que arma Administración en la hoja con sus marcas.
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
            Texto libre: lo escribe el docente como quiera. Contenido de la plantilla: lo arma usted en la hoja con texto, listas, tablas y lo que se inserta desde Insertar.
        </FieldDescription>
        <FieldError :errors="[error]" />
    </Field>
</template>
