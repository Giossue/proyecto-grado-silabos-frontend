<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FixedSubjectField } from '@/types/academic';

const props = defineProps<{
    field: FixedSubjectField;
    inputId: string;
    value: number | string;
    error?: string;
    class?: HTMLAttributes['class'];
}>();

const emit = defineEmits<{
    'update:value': [value: unknown];
}>();

const inputName = computed(() => props.field.system_key);
const inputType = computed(() =>
    props.field.type === 'numero' || props.field.type === 'entero'
        ? 'number'
        : 'text',
);
// Topes del servidor; sin `max`, los lectores de pantalla anuncian un máximo de 0.
const maxValue = computed((): number | undefined => {
    if (inputType.value !== 'number') return undefined;
    if (props.field.system_key === 'horas_totales') return 32767;
    return props.field.type === 'numero' ? 9999.99 : 9999;
});
const isCalculatedTotal = computed(
    () => props.field.system_key === 'horas_totales',
);
</script>

<template>
    <Field :class="props.class" :data-invalid="Boolean(error)">
        <FieldLabel :for="inputId" required>
            {{ field.label }}
        </FieldLabel>
        <Select
            v-if="field.type === 'booleano'"
            :name="inputName"
            :model-value="String(value)"
            required
            @update:model-value="emit('update:value', $event)"
        >
            <SelectTrigger
                :id="inputId"
                class="w-full"
                :aria-invalid="Boolean(error)"
            >
                <SelectValue placeholder="Seleccione una opción" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="true">Sí</SelectItem>
                <SelectItem value="false">No</SelectItem>
            </SelectContent>
        </Select>
        <Input
            v-else
            :id="inputId"
            :name="inputName"
            :type="inputType"
            :step="field.type === 'numero' ? '0.01' : undefined"
            :min="inputType === 'number' ? 0 : undefined"
            :max="maxValue"
            :model-value="value"
            :placeholder="
                field.type === 'texto' ? `Ej. ${field.label}` : undefined
            "
            :readonly="isCalculatedTotal"
            :aria-readonly="isCalculatedTotal || undefined"
            aria-required="true"
            :aria-invalid="Boolean(error)"
            @update:model-value="emit('update:value', $event)"
        />
        <FieldError :errors="[error]" />
    </Field>
</template>

