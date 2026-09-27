<script setup lang="ts">
import { UserRoundPlus } from '@lucide/vue';
import { computed, ref } from 'vue';
import CurricularOptionsSourceSelect from '@/components/domain/configuration/CurricularOptionsSourceSelect.vue';
import type { TemplateVariable } from '@/lib/templateDocument';
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
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type NewTeacherField = {
    label: string;
    type: string;
    options: string[];
    options_sources: string[];
};

defineProps<{ variables?: TemplateVariable[] }>();

const emit = defineEmits<{
    create: [field: NewTeacherField];
}>();

const newFieldOpen = ref(false);
const newFieldLabel = ref('');
const newFieldType = ref('texto_largo');
const newFieldOptions = ref('Sí, No');
const newFieldError = ref('');
const optionsSources = ref<string[]>([]);
const isChoice = computed(() => ['seleccion_unica', 'seleccion_multiple'].includes(newFieldType.value));

const open = (): void => {
    newFieldLabel.value = '';
    newFieldType.value = 'texto_largo';
    newFieldOptions.value = 'Sí, No';
    newFieldError.value = '';
    optionsSources.value = [];
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
        newFieldType.value === 'seleccion_unica' && !optionsSources.value.length ? parsedOptions() : [];

    if (!label) {
        newFieldError.value = 'Escriba el nombre que verá el docente.';

        return;
    }

    if (label.length > 180) {
        newFieldError.value = 'Use un nombre de hasta 180 caracteres.';

        return;
    }

    if (newFieldType.value === 'seleccion_multiple' && !optionsSources.value.length) {
        newFieldError.value = 'Selecciona la lista curricular que ofrecerá las opciones.';
        return;
    }

    if (newFieldType.value === 'seleccion_unica' && !optionsSources.value.length && options.length < 2) {
        newFieldError.value =
            'Escriba al menos dos opciones separadas por comas.';

        return;
    }

    emit('create', { label, type: newFieldType.value, options, options_sources: isChoice.value ? optionsSources.value : [] });
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
                            <SelectGroup>
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
                            <SelectItem value="seleccion_multiple">Selección múltiple desde una lista curricular</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </Field>
                <CurricularOptionsSourceSelect v-if="isChoice" id="table-field-source" v-model="optionsSources" :variables="variables" :manual="newFieldType === 'seleccion_unica'" />
                <Field v-if="newFieldType === 'seleccion_unica' && !optionsSources.length">
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
