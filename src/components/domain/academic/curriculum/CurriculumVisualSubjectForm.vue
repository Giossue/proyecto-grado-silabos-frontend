<script setup lang="ts">
import { Check } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createCareerRecord, updateCareerRecord } from '@/api/career-academics';
import CurriculumSubjectFieldInput from '@/components/domain/academic/curriculum/CurriculumSubjectFieldInput.vue';
import OrganizationUnitInput from '@/components/domain/academic/curriculum/OrganizationUnitInput.vue';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import { useCurriculumSubjectFieldValues } from '@/composables/useCurriculumSubjectFieldValues';
import { INHERITED_MODALITY } from '@/lib/studyModalities';
import type {
    CurriculumBuilderProps,
    CurriculumBuilderSubject,
    FixedSubjectField,
} from '@/types/academic';

const props = defineProps<{
    career: CurriculumBuilderProps['career'];
    modalityOptions: CurriculumBuilderProps['modalityOptions'];
    curriculum: CurriculumBuilderProps['curriculum'];
    fixedFields: FixedSubjectField[];
    subject: CurriculumBuilderSubject | null;
    cycle: number;
    position: number;
    organizationUnits: string[];
}>();

/** Por defecto la de la carrera; una excepción no modifica la modalidad base. */
const modality = ref(props.subject?.modality ?? INHERITED_MODALITY);
watch(
    () => props.subject?.modality,
    (value) => {
        modality.value = value ?? INHERITED_MODALITY;
    },
);

const emit = defineEmits<{
    cancel: [];
    saved: [message?: string];
}>();
const errors = ref<Record<string, string | undefined>>({});
const processing = ref(false);

const { updateValue, valueFor } = useCurriculumSubjectFieldValues(
    () => props.subject,
    () => props.fixedFields,
);

const errorKey = (field: FixedSubjectField): string => field.system_key;
const organizationUnit = ref(props.subject?.organization_unit ?? '');

watch(
    () => props.subject?.organization_unit,
    (value) => {
        organizationUnit.value = value ?? '';
    },
);
const submit = async (event: Event): Promise<void> => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLFormElement)) return;
    processing.value = true;
    errors.value = {};
    const payload = Object.fromEntries(new FormData(target).entries());
    try {
        const result = props.subject
            ? await updateCareerRecord('asignatura', props.subject.id, payload)
            : await createCareerRecord('asignatura', payload);
        emit('saved', result.message);
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0]]),
            );
            errors.value.record ??= reason.message;
        } else {
            errors.value.record = 'No se pudo guardar la materia.';
        }
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <form
        :key="subject?.id ?? `new-${cycle}-${position}`"
        class="nodrag nopan nowheel w-[36rem] cursor-default rounded-md bg-card p-3 text-card-foreground shadow-modal ring-1 ring-surface-ring"
        @keydown.stop
        @mousedown.stop
        @submit.prevent="submit"
    >
        <input type="hidden" name="cycle" :value="cycle" />
        <input type="hidden" name="position" :value="position" />
        <FieldGroup class="gap-3">
            <Field v-if="errors.record" data-invalid>
                <FieldError :errors="[errors.record]" />
            </Field>

            <div class="grid grid-cols-[10rem_minmax(0,1fr)] gap-2">
                <Field :data-invalid="Boolean(errors.code)">
                    <FieldLabel
                        :for="`visual-subject-code-${subject?.id ?? cycle}`"
                        required
                    >
                        Código
                    </FieldLabel>
                    <Input
                        :id="`visual-subject-code-${subject?.id ?? cycle}`"
                        name="code"
                        :default-value="subject?.code"
                        placeholder="Ej. SW-601"
                        required
                        :aria-invalid="Boolean(errors.code)"
                    />
                    <FieldError :errors="[errors.code]" />
                </Field>
                <Field :data-invalid="Boolean(errors.nombre)">
                    <FieldLabel
                        :for="`visual-subject-name-${subject?.id ?? cycle}`"
                        required
                    >
                        Nombre
                    </FieldLabel>
                    <Input
                        :id="`visual-subject-name-${subject?.id ?? cycle}`"
                        name="nombre"
                        :default-value="subject?.name"
                        placeholder="Ej. Ingeniería de requisitos"
                        required
                        :aria-invalid="Boolean(errors.nombre)"
                    />
                    <FieldError :errors="[errors.nombre]" />
                </Field>
            </div>

            <Field :data-invalid="Boolean(errors.organization_unit)">
                <FieldLabel
                    :for="`visual-subject-unit-${subject?.id ?? cycle}`"
                    required
                >
                    Unidad de organización curricular
                </FieldLabel>
                <OrganizationUnitInput
                    :id="`visual-subject-unit-${subject?.id ?? cycle}`"
                    name="organization_unit"
                    v-model="organizationUnit"
                    :options="organizationUnits"
                    :invalid="Boolean(errors.organization_unit)"
                />
                <FieldError :errors="[errors.organization_unit]" />
            </Field>

            <Field :data-invalid="Boolean(errors.modality)">
                <FieldLabel
                    :for="`visual-subject-modality-${subject?.id ?? cycle}`"
                >
                    Modalidad
                </FieldLabel>
                <input
                    type="hidden"
                    name="modality"
                    :value="modality === INHERITED_MODALITY ? '' : modality"
                />
                <Select v-model="modality">
                    <SelectTrigger
                        :id="`visual-subject-modality-${subject?.id ?? cycle}`"
                        :aria-invalid="Boolean(errors.modality)"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem :value="INHERITED_MODALITY">
                                Igual que la carrera ({{
                                    career.modality?.label ?? 'sin modalidad'
                                }})
                            </SelectItem>
                            <SelectItem
                                v-for="item in modalityOptions"
                                :key="item.value"
                                :value="item.value"
                            >
                                {{ item.label }}
                            </SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
                <FieldError :errors="[errors.modality]" />
            </Field>

            <div
                v-if="fixedFields.length > 0"
                class="-m-1 flex gap-2 overflow-x-auto p-1"
            >
                <CurriculumSubjectFieldInput
                    v-for="field in fixedFields"
                    :key="field.id"
                    class="min-w-24 flex-1 gap-1"
                    :field="field"
                    :input-id="`visual-subject-${subject?.id ?? cycle}-${field.id}`"
                    :value="valueFor(field)"
                    :error="errors[errorKey(field)]"
                    @update:value="updateValue(field, $event)"
                />
            </div>

            <div class="flex justify-end gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    :disabled="processing"
                    @click="emit('cancel')"
                >
                    Cancelar
                </Button>
                <Button type="submit" size="sm" :disabled="processing">
                    <Spinner v-if="processing" data-icon="inline-start" />
                    <Check v-else data-icon="inline-start" aria-hidden="true" />
                    {{ subject ? 'Guardar' : 'Agregar materia' }}
                </Button>
            </div>
        </FieldGroup>
    </form>
</template>
