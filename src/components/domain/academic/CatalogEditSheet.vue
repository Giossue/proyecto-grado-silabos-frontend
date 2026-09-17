<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STUDY_MODALITIES } from '@/lib/studyModalities';
import type { CatalogRecord, GovernanceCatalogEntity } from '@/types/academic';

const props = withDefaults(defineProps<{
    entity: GovernanceCatalogEntity; recordId: string; recordName: string; recordCode: string | null;
    facultyId?: string | null; modality?: string | null; campusId?: string | null;
    startsOn?: string | null; endsOn?: string | null; teachingWeeks?: number | null;
    faculties: CatalogRecord[]; campuses?: CatalogRecord[]; logoUrl?: string | null; showTrigger?: boolean;
}>(), { showTrigger: true, campuses: () => [] });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const logo = ref<File | null>(null);
const form = ref({ nombre: '', code: '', faculty_id: '', campus_id: '', modality: '', starts_on: '', ends_on: '', teaching_weeks: 16 });

const entityLabel = computed(() => ({ facultad: 'facultad', carrera: 'carrera', campus: 'campus', periodo: 'periodo académico' })[props.entity]);
const codeLabel = computed(() => ({ facultad: 'Código de facultad', carrera: 'Código de carrera', campus: 'Código de campus', periodo: 'Código estable' })[props.entity]);
const facultyOptions = computed(() => props.faculties.filter((faculty) => faculty.activo || faculty.id === props.facultyId));

const reset = (): void => {
    form.value = {
        nombre: props.recordName, code: props.recordCode ?? '', faculty_id: props.facultyId ?? '',
        campus_id: props.campusId ?? '', modality: props.modality ?? '', starts_on: props.startsOn ?? '',
        ends_on: props.endsOn ?? '', teaching_weeks: props.teachingWeeks ?? 16,
    };
    logo.value = null;
    errors.value = {};
};
watch(open, (value) => { if (value) reset(); }, { immediate: true });
const setLogo = (event: Event): void => { logo.value = (event.target as HTMLInputElement).files?.[0] ?? null; };
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    const payload = new FormData();
    for (const [key, value] of Object.entries(form.value)) payload.set(key, String(value));
    if (logo.value) payload.set('logo', logo.value);
    try {
        const result = await updateAcademicRecord(props.entity, props.recordId, payload);
        open.value = false;
        emit('saved', result.message);
    } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" trigger-label="Editar" :title="`Editar ${entityLabel}`" description="Actualice los datos institucionales. Los cambios quedarán registrados en auditoría." :show-trigger="showTrigger">
        <template #default="{ close }">
            <form @submit.prevent="submit"><FieldGroup>
                <Field v-if="entity === 'facultad'" :data-invalid="Boolean(errors.logo)"><FieldLabel :for="`edit-faculty-logo-${recordId}`">Logo de la facultad (PNG sin fondo)</FieldLabel><img v-if="logoUrl" :src="logoUrl" alt="Logo actual de la facultad" class="h-12 w-auto rounded border bg-white p-1"><Input :id="`edit-faculty-logo-${recordId}`" type="file" accept="image/png" @change="setLogo" /><FieldError :errors="errors.logo" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.faculty_id)"><FieldLabel :for="`edit-faculty-${recordId}`" required>Facultad</FieldLabel><Select v-model="form.faculty_id" required><SelectTrigger :id="`edit-faculty-${recordId}`"><SelectValue placeholder="Seleccione una facultad" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="faculty in facultyOptions" :key="faculty.id" :value="faculty.id">{{ faculty.nombre }} {{ faculty.activo ? '' : '(inactiva)' }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.faculty_id" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.modality)"><FieldLabel :for="`edit-modality-${recordId}`" required>Modalidad</FieldLabel><Select v-model="form.modality" required><SelectTrigger :id="`edit-modality-${recordId}`"><SelectValue placeholder="Seleccione la modalidad aprobada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in STUDY_MODALITIES" :key="item.value" :value="item.value">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.modality" /></Field>
                <Field v-if="entity === 'carrera'" :data-invalid="Boolean(errors.campus_id)"><FieldLabel :for="`edit-campus-${recordId}`" required>Campus</FieldLabel><Select v-model="form.campus_id" required><SelectTrigger :id="`edit-campus-${recordId}`"><SelectValue placeholder="Seleccione la sede aprobada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="campus in campuses" :key="campus.id" :value="campus.id">{{ campus.nombre }} {{ campus.activo ? '' : '(inactivo)' }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.campus_id" /></Field>
                <Field v-if="entity !== 'periodo'" :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`edit-name-${recordId}`" required>Nombre</FieldLabel><Input :id="`edit-name-${recordId}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
                <Field :data-invalid="Boolean(errors.code)"><FieldLabel :for="`edit-code-${recordId}`" :required="entity === 'periodo'">{{ codeLabel }}</FieldLabel><Input :id="`edit-code-${recordId}`" v-model="form.code" :required="entity === 'periodo'" /><FieldError :errors="errors.code" /></Field>
                <template v-if="entity === 'periodo'">
                    <Field :data-invalid="Boolean(errors.starts_on)"><FieldLabel :for="`edit-starts-on-${recordId}`" required>Fecha de inicio</FieldLabel><DatePicker :id="`edit-starts-on-${recordId}`" v-model="form.starts_on" required /><FieldError :errors="errors.starts_on" /></Field>
                    <Field :data-invalid="Boolean(errors.ends_on)"><FieldLabel :for="`edit-ends-on-${recordId}`" required>Fecha de fin</FieldLabel><DatePicker :id="`edit-ends-on-${recordId}`" v-model="form.ends_on" required /><FieldError :errors="errors.ends_on" /></Field>
                    <Field :data-invalid="Boolean(errors.teaching_weeks)"><FieldLabel :for="`edit-teaching-weeks-${recordId}`" required>Semanas lectivas</FieldLabel><Input :id="`edit-teaching-weeks-${recordId}`" v-model="form.teaching_weeks" type="number" min="1" max="52" required /><FieldError :errors="errors.teaching_weeks" /></Field>
                </template>
                <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
            </FieldGroup></form>
        </template>
    </FormSheet>
</template>
