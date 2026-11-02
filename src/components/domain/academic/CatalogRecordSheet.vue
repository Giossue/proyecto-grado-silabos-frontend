<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { ArrowLeft, ArrowRight, Plus } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createAcademicRecord } from '@/api/academic';
import DatePicker from '@/components/DatePicker.vue';
import FacultyLibraryChecks from '@/components/domain/academic/FacultyLibraryChecks.vue';
import FacultyLogoField from '@/components/domain/academic/FacultyLogoField.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SheetFooter } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { initialLibraries, librariesToStore, useCatalogLibraries } from '@/composables/useCatalogLibraries';
import type { AcademicStructureProps, GovernanceCatalogEntity } from '@/types/academic';
import { useInstitutionToday } from '@/composables/useInstitutionDate';

const props = withDefaults(defineProps<Pick<AcademicStructureProps, 'options'> & { entity: GovernanceCatalogEntity; disabled?: boolean; showTrigger?: boolean }>(), { disabled: false, showTrigger: true });
const emit = defineEmits<{ saved: [message: string] }>();

const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const open = defineModel<boolean>('open', { default: false });
const form = ref({
    nombre: '', code: '', faculty_id: '', campus: '', modality: '',
    cycle_count: '', starts_on: '', ends_on: '',
});
const logo = ref<File | null>(null);

// Una facultad se crea en dos pasos: sus datos y las bibliotecas de Koha donde buscan sus docentes.
const step = ref<1 | 2>(1);
const forward = ref(true);
const chosenLibraries = ref<string[]>([]);
const { libraries: koha, error: kohaError, load: loadKoha } = useCatalogLibraries();
const goTo = (target: 1 | 2): void => {
    forward.value = target > step.value;
    step.value = target;
};
const loadLibraries = async (): Promise<void> => {
    await loadKoha();
    if (koha.value !== null) chosenLibraries.value = initialLibraries([], koha.value);
};
const minimumPeriodDate = useInstitutionToday();
const minimumPeriodEndDate = computed(() => form.value.starts_on || minimumPeriodDate.value);

watch(() => form.value.starts_on, (startsOn) => {
    if (startsOn && form.value.ends_on && form.value.ends_on < startsOn) {
        form.value.ends_on = '';
    }
});

const labels = computed(() => ({
    facultad: { trigger: 'Nueva facultad', title: 'Nueva facultad' },
    carrera: { trigger: 'Nueva carrera', title: 'Nueva carrera' },
    periodo: { trigger: 'Nuevo periodo académico', title: 'Nuevo periodo académico' },
})[props.entity]);
const submitLabel = computed(() => ({ facultad: 'Crear facultad', carrera: 'Crear carrera', periodo: 'Crear periodo' })[props.entity]);

const logoValidationError = (message: string | null): void => {
    const nextErrors = { ...errors.value };
    if (message) nextErrors.logo = [message];
    else delete nextErrors.logo;
    errors.value = nextErrors;
};
const reset = (): void => {
    form.value = { nombre: '', code: '', faculty_id: '', campus: '', modality: '', cycle_count: '', starts_on: '', ends_on: '' };
    logo.value = null;
    errors.value = {};
    step.value = 1;
    forward.value = true;
    chosenLibraries.value = [];
};
watch(open, (value) => {
    if (!value) return;
    reset();
    if (props.entity === 'facultad') void loadLibraries();
});
const submit = async (): Promise<void> => {
    if (props.disabled) return;
    errors.value = {};
    if (props.entity === 'facultad' && !logo.value) {
        errors.value = { logo: ['El logo de la facultad es obligatorio'] };
        return;
    }
    if (props.entity === 'facultad' && step.value === 1) {
        goTo(2);
        return;
    }
    if (props.entity === 'facultad' && koha.value !== null && chosenLibraries.value.length === 0) {
        errors.value = { catalog_libraries: ['Marque al menos una biblioteca'] };
        return;
    }
    processing.value = true;
    const payload = new FormData();
    for (const [key, value] of Object.entries(form.value)) {
        if (key === 'code' && props.entity !== 'carrera') continue;
        payload.set(key, String(value));
    }
    if (logo.value) payload.set('logo', logo.value);
    const libraries = props.entity === 'facultad' && koha.value !== null ? librariesToStore(chosenLibraries.value, koha.value) : [];
    if (libraries.length > 0) payload.set('catalog_libraries', JSON.stringify(libraries));
    try {
        const result = await createAcademicRecord(props.entity, payload);
        open.value = false;
        reset();
        emit('saved', result.message);
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
        if (props.entity === 'facultad') goTo(Object.keys(errors.value).some((key) => key.startsWith('catalog_libraries')) ? 2 : 1);
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <FormSheet v-model:open="open" :disabled="props.disabled" :show-trigger="props.showTrigger" :trigger-label="labels.trigger" :title="labels.title">
        <template #default="{ close }">
            <form @submit.prevent="submit">
                <FieldGroup>
                    <Transition :name="forward ? 'step-next' : 'step-back'" mode="out-in">
                        <FieldGroup v-if="entity === 'facultad' && step === 1" key="datos">
                        <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="catalog-name" required>Nombre</FieldLabel><Input id="catalog-name" v-model="form.nombre" aria-required="true" /><FieldError :errors="errors.nombre" /></Field>
                        <Field :data-invalid="Boolean(errors.campus)">
                            <FieldLabel for="catalog-campus" required>Campus</FieldLabel>
                            <Select v-model="form.campus" required><SelectTrigger id="catalog-campus"><SelectValue placeholder="Seleccione el campus de la facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.campusOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select>
                            <FieldError :errors="errors.campus" />
                        </Field>
                        <Field :data-invalid="Boolean(errors.logo)">
                            <FieldLabel for="faculty-logo" required>Logo de la facultad</FieldLabel>
                            <FacultyLogoField v-model="logo" input-id="faculty-logo" :disabled="processing" :invalid="Boolean(errors.logo)" required @validation-error="logoValidationError" />
                            <FieldDescription>Suba el logo como lo tenga: el sistema lo deja en 600 × 180 px y con fondo transparente</FieldDescription>
                            <FieldError :errors="errors.logo" />
                        </Field>
                        </FieldGroup>
                        <FacultyLibraryChecks v-else-if="entity === 'facultad'" key="bibliotecas" v-model="chosenLibraries" :libraries="koha" :error="kohaError" id-prefix="new-library" :invalid="errors.catalog_libraries" />
                    </Transition>
                    <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.faculty_id)">
                        <FieldLabel for="catalog-faculty" required>Facultad</FieldLabel>
                        <Select v-model="form.faculty_id" required><SelectTrigger id="catalog-faculty"><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.faculties" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select>
                        <FieldError :errors="errors.faculty_id" />
                    </Field>
                    <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.modality)">
                        <FieldLabel for="catalog-modality" required>Modalidad</FieldLabel>
                        <Select v-model="form.modality" required><SelectTrigger id="catalog-modality"><SelectValue placeholder="Seleccione la modalidad aprobada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.modalityOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select>
                        <FieldError :errors="errors.modality" />
                    </Field>
                    <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.nombre)"><FieldLabel for="catalog-name" required>Nombre</FieldLabel><Input id="catalog-name" v-model="form.nombre" aria-required="true" /><FieldError :errors="errors.nombre" /></Field>
                    <div v-if="entity === 'carrera'" class="grid grid-cols-2 items-start gap-4">
                        <Field :data-invalid="Boolean(errors.code)"><FieldLabel for="catalog-code" required>Código de carrera</FieldLabel><Input id="catalog-code" v-model="form.code" aria-required="true" /><FieldError :errors="errors.code" /></Field>
                        <Field :data-invalid="Boolean(errors.cycle_count)"><FieldLabel for="catalog-cycle-count" required>Cantidad de ciclos</FieldLabel><Input id="catalog-cycle-count" v-model="form.cycle_count" type="number" min="1" :max="VALIDATION_LIMITS.cycleCount" step="1" aria-required="true" /><FieldError :errors="errors.cycle_count" /></Field>
                    </div>
                    <div v-if="entity === 'periodo'" class="grid grid-cols-2 items-start gap-4">
                        <Field :data-invalid="Boolean(errors.starts_on)"><FieldLabel for="catalog-starts-on" required>Fecha de inicio</FieldLabel><DatePicker id="catalog-starts-on" v-model="form.starts_on" :min-value="minimumPeriodDate" :aria-invalid="Boolean(errors.starts_on)" required /><FieldDescription>Debe ser hoy o una fecha posterior</FieldDescription><FieldError :errors="errors.starts_on" /></Field>
                        <Field :data-invalid="Boolean(errors.ends_on)"><FieldLabel for="catalog-ends-on" required>Fecha de fin</FieldLabel><DatePicker id="catalog-ends-on" v-model="form.ends_on" :min-value="minimumPeriodEndDate" :aria-invalid="Boolean(errors.ends_on)" required /><FieldError :errors="errors.ends_on" /></Field>
                    </div>
                    <SheetFooter v-if="entity === 'facultad'" class="absolute inset-x-0 bottom-0 bg-card pb-(--safe-footer-inset)">
                        <Field orientation="horizontal" class="justify-end">
                            <Button v-if="step === 1" type="button" variant="outline" @click="close">Cancelar</Button>
                            <Button v-else type="button" variant="outline" @click="goTo(1)"><ArrowLeft data-icon="inline-start" aria-hidden="true" />Atrás</Button>
                            <Button v-if="step === 1" type="submit">Siguiente<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button>
                            <Button v-else type="submit" :disabled="processing || (koha !== null && chosenLibraries.length === 0)">
                                <Spinner v-if="processing" data-icon="inline-start" />
                                <Plus v-else data-icon="inline-start" aria-hidden="true" />
                                {{ submitLabel }}
                            </Button>
                        </Field>
                    </SheetFooter>
                    <FormSheetActions v-else :close="close" :processing="processing" :icon="Plus" :label="submitLabel" />
                </FieldGroup>
            </form>
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
