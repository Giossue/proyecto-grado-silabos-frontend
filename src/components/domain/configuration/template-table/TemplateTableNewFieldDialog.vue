<script setup lang="ts">
import { UserRoundPlus } from '@lucide/vue';
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type NewTeacherField = {
    label: string;
    type: string;
    options: string[];
};

const emit = defineEmits<{
    create: [field: NewTeacherField];
}>();

const newFieldOpen = ref(false);
const newFieldLabel = ref('');
const newFieldType = ref('texto_largo');
const newFieldOptions = ref('Sí, No');
const newFieldError = ref('');

const open = (): void => {
    newFieldLabel.value = '';
    newFieldType.value = 'texto_largo';
    newFieldOptions.value = 'Sí, No';
    newFieldError.value = '';
    newFieldOpen.value = true;
};

const parsedOptions = (): string[] => [
    ...new Set(
        newFieldOptions.value
            .split(',')
            .map((option) => option.trim())
            .filter(Boolean),
    ),
];

const createField = (): void => {
    const label = newFieldLabel.value.trim();
    const options =
        newFieldType.value === 'seleccion_unica' ? parsedOptions() : [];

    if (!label) {
        newFieldError.value = 'Escriba el nombre que verá el docente.';

        return;
    }

    if (label.length > 180) {
        newFieldError.value = 'Use un nombre de hasta 180 caracteres.';

        return;
    }

    if (newFieldType.value === 'seleccion_unica' && options.length < 2) {
        newFieldError.value =
            'Escriba al menos dos opciones separadas por comas.';

        return;
    }

    emit('create', { label, type: newFieldType.value, options });
    newFieldOpen.value = false;
};

defineExpose({ open });
</script>

<template>
    <Dialog v-model:open="newFieldOpen">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Nueva pregunta al docente</DialogTitle>
                <DialogDescription>
                    Se insertará en la celda seleccionada y aparecerá en el
                    formulario del sílabo.
                </DialogDescription>
            </DialogHeader>

            <FieldGroup>
                <Field>
                    <FieldLabel for="table-field-label"
                        >Pregunta que verá el docente</FieldLabel
                    >
                    <Input
                        id="table-field-label"
                        v-model="newFieldLabel"
                        maxlength="180"
                        placeholder="Ej. Tipo de discapacidad"
                    />
                </Field>
                <Field>
                    <FieldLabel for="table-field-type">
                        Tipo de respuesta
                    </FieldLabel>
                    <Select v-model="newFieldType">
                        <SelectTrigger id="table-field-type" class="w-full">
                            <SelectValue placeholder="Seleccione un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="texto_corto"
                                >Texto corto</SelectItem
                            >
                            <SelectItem value="texto_largo"
                                >Texto largo</SelectItem
                            >
                            <SelectItem value="numero">Número</SelectItem>
                            <SelectItem value="fecha">Fecha</SelectItem>
                            <SelectItem value="seleccion_unica"
                                >Selección única</SelectItem
                            >
                        </SelectContent>
                    </Select>
                </Field>
                <Field v-if="newFieldType === 'seleccion_unica'">
                    <FieldLabel for="table-field-options">Opciones</FieldLabel>
                    <Input
                        id="table-field-options"
                        v-model="newFieldOptions"
                        placeholder="Ej. Sí, No"
                    />
                    <FieldDescription>
                        Separe cada opción con una coma.
                    </FieldDescription>
                </Field>
                <p v-if="newFieldError" class="text-sm text-destructive">
                    {{ newFieldError }}
                </p>
            </FieldGroup>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    @click="newFieldOpen = false"
                >
                    Cancelar
                </Button>
                <Button type="button" @click="createField">
                    <UserRoundPlus
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    Insertar pregunta
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
