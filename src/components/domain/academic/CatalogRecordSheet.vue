<script setup lang="ts">
import { Plus } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { createAcademicRecord } from '@/api/academic';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STUDY_MODALITIES } from '@/lib/studyModalities';
import type { AcademicStructureProps, GovernanceCatalogEntity } from '@/types/academic';

const props = withDefaults(defineProps<Pick<AcademicStructureProps, 'options'> & { entity: GovernanceCatalogEntity; disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{ saved: [message: string] }>();

const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const open = ref(false);
const form = ref({
    nombre: '', code: '', faculty_id: '', campus: '', modality: '',
    curriculum_code: '', cycle_count: 8, starts_on: '', ends_on: '', teaching_weeks: 16,
});
const logo = ref<File | null>(null);

const labels = computed(() => ({
    facultad: { trigger: 'Nueva facultad', title: 'Nueva facultad', description: 'Registre una unidad académica que agrupará sus carreras.' },
    carrera: { trigger: 'Nueva carrera', title: 'Nueva carrera', description: 'Registre una carrera dentro de una facultad activa.' },
    periodo: { trigger: 'Nuevo periodo académico', title: 'Nuevo periodo académico', description: 'Registre una ventana temporal institucional con fechas válidas.' },
})[props.entity]);
const submitLabel = computed(() => ({ facultad: 'Crear facultad', carrera: 'Crear carrera', periodo: 'Crear periodo' })[props.entity]);
const codeLabel = computed(() => ({ facultad: 'Código de facultad', carrera: 'Código de carrera', periodo: 'Código estable' })[props.entity]);

const setLogo = (event: Event): void => {
    logo.value = (event.target as HTMLInputElement).files?.[0] ?? null;
};
const reset = (): void => {
    form.value = { nombre: '', code: '', faculty_id: '', campus: '', modality: '', curriculum_code: '', cycle_count: 8, starts_on: '', ends_on: '', teaching_weeks: 16 };
    logo.value = null;
};
const submit = async (): Promise<void> => {
    if (props.disabled) return;
    processing.value = true;
    errors.value = {};
    const payload = new FormData();
    for (const [key, value] of Object.entries(form.value)) payload.set(key, String(value));
    if (logo.value) payload.set('logo', logo.value);
    try {
        const result = await createAcademicRecord(props.entity, payload);
        open.value = false;
        reset();
        emit('saved', result.message);
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <FormSheet v-model:open="open" :disabled="props.disabled" :trigger-label="labels.trigger" :title="labels.title" :description="labels.description">
        <template #default="{ close }">
            <form @submit.prevent="submit">
                <FieldGroup>
                    <Field v-if="entity === 'facultad'" :data-invalid="Boolean(errors.campus)">
                        <FieldLabel for="catalog-campus" required>Campus</FieldLabel>
                        <Select v-model="form.campus" required><SelectTrigger id="catalog-campus"><SelectValue placeholder="Seleccione el campus de la facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.campusOptions" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select>
                        <FieldError :errors="errors.campus" />
                    </Field>
                    <Field v-if="entity === 'facultad'" :data-invalid="Boolean(errors.logo)">
                        <FieldLabel for="faculty-logo">Logo de la facultad (PNG sin fondo)</FieldLabel>
                        <Input id="faculty-logo" type="file" accept="image/png" @change="setLogo" />
                        <FieldDescription>Opcional para Administración. Si lo deja pendiente, Coordinación deberá cargarlo desde su Panel antes de abrir la convocatoria.</FieldDescription>
                        <FieldError :errors="errors.logo" />
                    </Field>
                    <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.faculty_id)">
                        <FieldLabel for="catalog-faculty" required>Facultad</FieldLabel>
                        <Select v-model="form.faculty_id" required><SelectTrigger id="catalog-faculty"><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.faculties" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select>
                        <FieldError :errors="errors.faculty_id" />
                    </Field>
                    <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.modality)">
                        <FieldLabel for="catalog-modality" required>Modalidad</FieldLabel>
                        <Select v-model="form.modality" required><SelectTrigger id="catalog-modality"><SelectValue placeholder="Seleccione la modalidad aprobada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in STUDY_MODALITIES" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select>
                        <FieldError :errors="errors.modality" />
                    </Field>
                    <Field v-if="entity !== 'periodo'" :data-invalid="Boolean(errors.nombre)"><FieldLabel for="catalog-name" required>Nombre</FieldLabel><Input id="catalog-name" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
                    <Field :data-invalid="Boolean(errors.code)"><FieldLabel for="catalog-code" :required="entity === 'periodo'">{{ codeLabel }}</FieldLabel><Input id="catalog-code" v-model="form.code" :required="entity === 'periodo'" /><FieldError :errors="errors.code" /></Field>
                    <template v-if="entity === 'carrera'">
                        <Field :data-invalid="Boolean(errors.curriculum_code)"><FieldLabel for="catalog-curriculum-code" required>Código de malla curricular</FieldLabel><Input id="catalog-curriculum-code" v-model="form.curriculum_code" placeholder="Ej. MALLA-SW-2026" required /><FieldError :errors="errors.curriculum_code" /></Field>
                        <Field :data-invalid="Boolean(errors.cycle_count)"><FieldLabel for="catalog-cycle-count" required>Cantidad de ciclos</FieldLabel><Input id="catalog-cycle-count" v-model="form.cycle_count" type="number" min="1" max="30" step="1" required /><FieldError :errors="errors.cycle_count" /></Field>
                    </template>
                    <template v-if="entity === 'periodo'">
                        <Field :data-invalid="Boolean(errors.starts_on)"><FieldLabel for="catalog-starts-on" required>Fecha de inicio</FieldLabel><DatePicker id="catalog-starts-on" v-model="form.starts_on" required /><FieldError :errors="errors.starts_on" /></Field>
                        <Field :data-invalid="Boolean(errors.ends_on)"><FieldLabel for="catalog-ends-on" required>Fecha de fin</FieldLabel><DatePicker id="catalog-ends-on" v-model="form.ends_on" required /><FieldError :errors="errors.ends_on" /></Field>
                        <Field :data-invalid="Boolean(errors.teaching_weeks)"><FieldLabel for="catalog-teaching-weeks" required>Semanas lectivas</FieldLabel><Input id="catalog-teaching-weeks" v-model="form.teaching_weeks" type="number" min="1" max="52" required /><FieldError :errors="errors.teaching_weeks" /></Field>
                    </template>
                    <FormSheetActions :close="close" :processing="processing" :icon="Plus" :label="submitLabel" />
                </FieldGroup>
            </form>
        </template>
    </FormSheet>
</template>
