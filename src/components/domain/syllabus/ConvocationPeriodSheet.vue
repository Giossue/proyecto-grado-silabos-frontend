<script setup lang="ts">
import { ArrowLeft, ArrowRight, CalendarPlus } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { createAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import { createProcess } from '@/api/processes';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { SheetFooter } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useCountdown } from '@/composables/useCountdown';
import { useInstitutionToday } from '@/composables/useInstitutionDate';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });

const processing = ref(false);
const confirmOpen = ref(false);
const openingCountdown = useCountdown(confirmOpen);
const errors = ref<Record<string, string[]>>({});
const form = ref({ starts_on: '', ends_on: '', teaching_weeks: '', starts_at: '', due_at: '' });
const createdPeriodId = ref<string | null>(null);

const todayIso = useInstitutionToday();
const periodEndMinimum = computed(() => form.value.starts_on || todayIso.value);
const dueMinimum = computed(() => (form.value.starts_at > todayIso.value ? form.value.starts_at : todayIso.value));
const periodEnd = computed(() => form.value.ends_on || undefined);
const step = ref<1 | 2>(1);
const forward = ref(true);
const goTo = (target: 1 | 2): void => {
    forward.value = target > step.value;
    step.value = target;
};
const periodComplete = computed(() => Boolean(form.value.starts_on && form.value.ends_on));
const monday = (iso: string): number => {
    const date = new Date(`${iso}T00:00:00Z`);
    return date.getTime() - ((date.getUTCDay() + 6) % 7) * 86_400_000;
};
const calendarWeeks = computed(() => periodComplete.value ? Math.round((monday(form.value.ends_on) - monday(form.value.starts_on)) / 604_800_000) + 1 : null);
const processComplete = computed(() => Boolean(form.value.starts_at && form.value.due_at));
const periodCreated = computed(() => createdPeriodId.value !== null);

watch(open, (value) => {
    if (value) {
        form.value = { starts_on: '', ends_on: '', teaching_weeks: '', starts_at: '', due_at: '' };
        errors.value = {};
        createdPeriodId.value = null;
        confirmOpen.value = false;
        step.value = 1;
    }
});
watch(() => form.value.starts_on, (startsOn) => {
    if (startsOn && form.value.ends_on && form.value.ends_on < startsOn) form.value.ends_on = '';
});

const askConfirmation = (): void => {
    if (step.value === 1) {
        if (periodComplete.value) goTo(2);
        return;
    }
    if (!props.disabled && processComplete.value) confirmOpen.value = true;
};
const submit = async (): Promise<void> => {
    if (props.disabled) return;
    confirmOpen.value = false;
    processing.value = true;
    errors.value = {};
    try {
        let periodId = createdPeriodId.value;
        let message = 'Periodo académico creado.';
        if (!periodId) {
            const period = await createAcademicRecord('periodo', {
                starts_on: form.value.starts_on,
                ends_on: form.value.ends_on,
                ...(form.value.teaching_weeks ? { teaching_weeks: Number(form.value.teaching_weeks) } : {}),
            });
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
        if (errors.value.starts_on || errors.value.ends_on) goTo(1);
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
        hide-title
    >
        <template #default="{ close }">
            <form @submit.prevent="askConfirmation">
                <FieldGroup>
                    <Field v-if="errors.process" data-invalid><FieldError :errors="errors.process" /></Field>
                    <div class="relative overflow-hidden">
                    <Transition :name="forward ? 'step-next' : 'step-back'" mode="out-in">
                    <FieldSet v-if="step === 1" key="period">
                        <FieldLegend>Periodo lectivo</FieldLegend>
                        <FieldDescription>{{ periodCreated ? 'El periodo ya quedó creado; solo falta abrir la convocatoria.' : 'Fechas de inicio y fin de clases; la etiqueta se genera con el rango de meses y año.' }}</FieldDescription>
                        <div class="grid grid-cols-2 items-start gap-4">
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
                        </div>
                        <Field :data-invalid="Boolean(errors.teaching_weeks)">
                            <FieldLabel for="convocation-period-weeks">Semanas de clase</FieldLabel>
                            <Input id="convocation-period-weeks" v-model="form.teaching_weeks" type="number" min="1" :max="calendarWeeks ?? 52" step="1" :placeholder="calendarWeeks ? String(calendarWeeks) : ''" :disabled="periodCreated" :aria-invalid="Boolean(errors.teaching_weeks)" />
                            <FieldDescription>{{ calendarWeeks ? `Si la deja vacía, se usan las ${calendarWeeks} semanas entre las fechas.` : 'Si la deja vacía, se cuentan con las fechas.' }}</FieldDescription>
                            <FieldError :errors="errors.teaching_weeks" />
                        </Field>
                    </FieldSet>
                    <FieldSet v-else key="syllabus">
                        <FieldLegend>Elaboración de sílabos</FieldLegend>
                        <FieldDescription>{{ periodCreated ? 'El periodo ya quedó creado; solo falta abrir la convocatoria.' : 'Elija cuándo empieza la elaboración y hasta cuándo se entrega.' }}</FieldDescription>
                        <div class="grid grid-cols-2 items-start gap-4">
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
                        </div>
                    </FieldSet>
                    </Transition>
                    </div>
                    <SheetFooter class="absolute inset-x-0 bottom-0 bg-card pb-(--safe-footer-inset)">
                        <Field orientation="horizontal" class="justify-end">
                            <Button v-if="step === 1" type="button" variant="outline" @click="close">Cancelar</Button>
                            <Button v-else type="button" variant="outline" @click="goTo(1)"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
                            <Button v-if="step === 1" type="submit" :disabled="!periodComplete">Siguiente<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
                            <Button v-else type="submit" :disabled="processing || props.disabled || !processComplete">
                                <Spinner v-if="processing" data-icon="inline-start" />
                                <CalendarPlus v-else data-icon="inline-start" aria-hidden="true" />
                                Abrir convocatoria
                            </Button>
                        </Field>
                    </SheetFooter>
                </FieldGroup>
            </form>
            <Dialog v-model:open="confirmOpen">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Abrir convocatoria</DialogTitle>
                        <DialogDescription>Una vez abierta, el periodo y sus fechas no se pueden editar. Los docentes conservarán lo que escribieron en el período anterior, salvo que la plantilla haya cambiado: en ese caso empiezan de cero.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="button" :disabled="processing || openingCountdown > 0" @click="submit"><Spinner v-if="processing" data-icon="inline-start" /><CalendarPlus v-else data-icon="inline-start" aria-hidden="true" />{{ openingCountdown > 0 ? `Abrir convocatoria (${openingCountdown})` : 'Abrir convocatoria' }}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </template>
    </FormSheet>
</template>

<style scoped>
.step-next-enter-active,
.step-next-leave-active,
.step-back-enter-active,
.step-back-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}
.step-next-enter-from,
.step-back-leave-to {
    transform: translateX(2rem);
    opacity: 0;
}
.step-next-leave-to,
.step-back-enter-from {
    transform: translateX(-2rem);
    opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
    .step-next-enter-active,
    .step-next-leave-active,
    .step-back-enter-active,
    .step-back-leave-active {
        transition: none;
    }
}
</style>
