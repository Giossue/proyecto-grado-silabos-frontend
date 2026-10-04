<script setup lang="ts">
import { CalendarPlus } from '@lucide/vue';
import { getLocalTimeZone, today } from '@internationalized/date';
import { computed, ref, watch } from 'vue';
import { createAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import { createProcess } from '@/api/processes';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });

const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ starts_on: '', ends_on: '', starts_at: '', due_at: '' });
// Si el periodo ya se creó pero la convocatoria falló, el reintento solo abre la convocatoria.
const createdPeriodId = ref<string | null>(null);

const todayIso = today(getLocalTimeZone()).toString();
const periodEndMinimum = computed(() => form.value.starts_on || todayIso);
const dueMinimum = computed(() => (form.value.starts_at > todayIso ? form.value.starts_at : todayIso));
const periodEnd = computed(() => form.value.ends_on || undefined);
const periodCreated = computed(() => createdPeriodId.value !== null);

watch(open, (value) => {
    if (value) {
        form.value = { starts_on: '', ends_on: '', starts_at: '', due_at: '' };
        errors.value = {};
        createdPeriodId.value = null;
    }
});
watch(() => form.value.starts_on, (startsOn) => {
    if (startsOn && form.value.ends_on && form.value.ends_on < startsOn) form.value.ends_on = '';
});

const submit = async (): Promise<void> => {
    if (props.disabled) return;
    processing.value = true;
    errors.value = {};
    try {
        let periodId = createdPeriodId.value;
        let message = 'Periodo académico creado.';
        if (!periodId) {
            const period = await createAcademicRecord('periodo', { starts_on: form.value.starts_on, ends_on: form.value.ends_on });
            periodId = period.id ?? null;
            message = period.message;
            createdPeriodId.value = periodId;
        }
        if (periodId) {
            const process = await createProcess({ period_id: periodId, starts_at: form.value.starts_at, due_at: form.value.due_at });
            message = process.message;
        }
        open.value = false;
        emit('saved', message);
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <FormSheet
        v-model:open="open"
        :disabled="props.disabled"
        trigger-label="Nueva convocatoria"
        title="Nueva convocatoria"
        description="Registre las fechas del periodo lectivo y las fechas en que los docentes elaboran y entregan sus sílabos. La etiqueta del periodo se genera con el rango de meses y año."
    >
        <template #default="{ close }">
            <form @submit.prevent="submit">
                <FieldGroup>
                    <Field v-if="errors.process" data-invalid><FieldError :errors="errors.process" /></Field>
                    <FieldSet>
                        <FieldLegend>Periodo lectivo</FieldLegend>
                        <FieldDescription v-if="periodCreated">El periodo ya quedó creado; solo falta abrir la convocatoria.</FieldDescription>
                        <Field :data-invalid="Boolean(errors.starts_on)">
                            <FieldLabel for="convocation-period-starts" required>Inicio de clases</FieldLabel>
                            <DatePicker id="convocation-period-starts" v-model="form.starts_on" :min-value="todayIso" :disabled="periodCreated" required :aria-invalid="Boolean(errors.starts_on)" />
                            <FieldError :errors="errors.starts_on" />
                        </Field>
                        <Field :data-invalid="Boolean(errors.ends_on)">
                            <FieldLabel for="convocation-period-ends" required>Fin de clases</FieldLabel>
                            <DatePicker id="convocation-period-ends" v-model="form.ends_on" :min-value="periodEndMinimum" :disabled="periodCreated" required :aria-invalid="Boolean(errors.ends_on)" />
                            <FieldError :errors="errors.ends_on" />
                        </Field>
                    </FieldSet>
                    <FieldSet>
                        <FieldLegend>Elaboración de sílabos</FieldLegend>
                        <FieldDescription>Las fechas no se copian del periodo: elija cuándo empieza la elaboración y hasta cuándo se entrega.</FieldDescription>
                        <Field :data-invalid="Boolean(errors.starts_at)">
                            <FieldLabel for="convocation-starts" required>Inicio de la elaboración</FieldLabel>
                            <DatePicker id="convocation-starts" v-model="form.starts_at" :min-value="todayIso" :max-value="periodEnd" required :aria-invalid="Boolean(errors.starts_at)" />
                            <FieldError :errors="errors.starts_at" />
                        </Field>
                        <Field :data-invalid="Boolean(errors.due_at)">
                            <FieldLabel for="convocation-due" required>Fecha límite de entrega</FieldLabel>
                            <DatePicker id="convocation-due" v-model="form.due_at" :min-value="dueMinimum" :max-value="periodEnd" required :aria-invalid="Boolean(errors.due_at)" />
                            <FieldError :errors="errors.due_at" />
                        </Field>
                    </FieldSet>
                    <FormSheetActions :close="close" :processing="processing" :icon="CalendarPlus" label="Abrir convocatoria" />
                </FieldGroup>
            </form>
        </template>
    </FormSheet>
</template>
