<script setup lang="ts">
import { Database } from '@lucide/vue';
import { ref } from 'vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { TableColumnRole } from '@/lib/tableLayout';

export type NewRepeatedData = {
    label: string;
    type: 'text' | 'number';
    role: TableColumnRole | 'none';
    scope: 'record' | 'unit';
};

// Las horas y semanas de Planificación vienen de fábrica: aquí no se configuran.
defineProps<{
    usedColumnRoles: Set<TableColumnRole>;
}>();

const emit = defineEmits<{
    create: [data: NewRepeatedData];
}>();

const newDataOpen = ref(false);
const newDataLabel = ref('');
const newDataType = ref<'text' | 'number'>('text');
const newDataRole = ref<TableColumnRole | 'none'>('none');
const newDataScope = ref<'record' | 'unit'>('record');
const newDataError = ref('');

const open = (scope: 'record' | 'unit'): void => {
    newDataScope.value = scope;
    newDataLabel.value = '';
    newDataType.value = 'text';
    newDataRole.value = 'none';
    newDataError.value = '';
    newDataOpen.value = true;
};

const updateNewDataOpen = (value: boolean): void => {
    newDataOpen.value = value;

    if (!value) {
        newDataError.value = '';
    }
};

const setNewDataType = (value: unknown): void => {
    if (value !== 'text' && value !== 'number') {
        return;
    }

    newDataType.value = value;

    if (value === 'text') {
        newDataRole.value = 'none';
    }
};

const createRepeatedData = (): void => {
    const label = newDataLabel.value.trim();

    if (!label) {
        newDataError.value = 'Escriba el nombre del dato.';

        return;
    }

    if (label.length > 180) {
        newDataError.value = 'Use un nombre de hasta 180 caracteres.';

        return;
    }

    emit('create', {
        label,
        type: newDataType.value,
        role: newDataRole.value,
        scope: newDataScope.value,
    });
    newDataOpen.value = false;
};

defineExpose({ open });
</script>

<template>
    <FormSheet
        :open="newDataOpen"
        trigger-label="Nuevo dato que llena el docente"
        title="Nuevo dato que llena el docente"
        description="Se insertará en la celda seleccionada. El docente lo llenará en cada fila que agregue."
        :show-trigger="false"
        @update:open="updateNewDataOpen"
    >
        <template #default="{ close }">
            <form
                class="flex flex-col gap-4"
                @submit.prevent="createRepeatedData"
            >
                <FieldGroup>
                    <Field :data-invalid="Boolean(newDataError)">
                        <FieldLabel for="table-data-label" required>
                            Nombre visible
                        </FieldLabel>
                        <Input
                            id="table-data-label"
                            v-model="newDataLabel"
                            maxlength="180"
                            placeholder="Ej. Contenidos temáticos"
                            :aria-invalid="Boolean(newDataError)"
                        />
                        <FieldError
                            v-if="newDataError"
                            :errors="[newDataError]"
                        />
                    </Field>

                    <Field v-if="newDataScope === 'record'">
                        <FieldLabel for="table-data-type" required>
                            Tipo de dato
                        </FieldLabel>
                        <Select
                            :model-value="newDataType"
                            @update:model-value="setNewDataType"
                        >
                            <SelectTrigger id="table-data-type" class="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="text">Texto</SelectItem>
                                    <SelectItem value="number">
                                        Número
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </Field>
                </FieldGroup>

                <FormSheetActions
                    label="Insertar dato"
                    :close="close"
                    :icon="Database"
                />
            </form>
        </template>
    </FormSheet>
</template>
