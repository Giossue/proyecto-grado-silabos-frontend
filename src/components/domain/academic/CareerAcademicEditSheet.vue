<script setup lang="ts">
import { Check } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateCareerRecord } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PARALLEL_SHIFTS as SHIFTS } from '@/lib/parallelShifts';

export type CareerAcademicEntity = 'asignatura' | 'programacion_asignatura' | 'paralelo' | 'asignacion_docente';
export type CareerAcademicEditableRecord = {
    id: string; code?: string; shift?: string | null; name?: string; cycle?: number | null;
    credits?: string | null; total_hours?: number | null; subject_id?: string; period_id?: string;
    scheduled_subject_id?: string; user_id?: string; parallel_id?: string;
    parallels?: { id: string; code: string; shift: string | null }[];
};
export type CareerAcademicOptions = {
    activeSubjects?: Array<{ id: string; codigo_asignatura?: string; nombre?: string }>;
    periods?: Array<{ id: string; code?: string; nombre?: string; planning_enabled?: boolean }>;
    scheduledSubjects?: Array<{ id: string; label?: string }>;
    teacherUsers?: Array<{ id: string; name?: string; email?: string }>;
    parallels?: Array<{ id: string; label?: string }>;
};

const props = defineProps<{ entity: CareerAcademicEntity; record: CareerAcademicEditableRecord; options: CareerAcademicOptions }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref<Record<string, string | number>>({});
const entityLabel = computed(() => ({ asignatura: 'materia', programacion_asignatura: 'programación de asignatura', paralelo: 'paralelo', asignacion_docente: 'asignación docente' })[props.entity]);
const planningPeriods = computed(() => (props.options.periods ?? []).filter((period) => period.planning_enabled !== false));
const reset = (): void => { form.value = {
    code: props.record.code ?? '', shift: props.record.shift ?? '', nombre: props.record.name ?? '', cycle: props.record.cycle ?? '',
    creditos: props.record.credits ?? '', horas_totales: props.record.total_hours ?? '', subject_id: props.record.subject_id ?? '',
    period_id: props.record.period_id ?? '', scheduled_subject_id: props.record.scheduled_subject_id ?? '',
    user_id: props.record.user_id ?? '', parallel_id: props.record.parallel_id ?? '',
}; errors.value = {}; };
watch(open, (value) => { if (value) reset(); });
const submit = async (): Promise<void> => { processing.value = true; errors.value = {}; try { const result = await updateCareerRecord(props.entity, props.record.id, form.value); open.value = false; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet v-model:open="open" trigger-label="Editar" :title="`Editar ${entityLabel}`" description="Actualice los datos dentro de su carrera. El cambio quedará registrado en auditoría." :show-trigger="false">
    <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
        <Field v-if="errors.record" data-invalid><FieldError :errors="errors.record" /></Field>
        <template v-if="entity === 'asignatura'"><Field :data-invalid="Boolean(errors.code)"><FieldLabel :for="`edit-subject-code-${record.id}`" required>Código</FieldLabel><Input :id="`edit-subject-code-${record.id}`" v-model="form.code" required /><FieldError :errors="errors.code" /></Field><Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`edit-subject-name-${record.id}`" required>Nombre</FieldLabel><Input :id="`edit-subject-name-${record.id}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field><Field :data-invalid="Boolean(errors.cycle)"><FieldLabel :for="`edit-subject-cycle-${record.id}`">Ciclo</FieldLabel><Input :id="`edit-subject-cycle-${record.id}`" v-model="form.cycle" type="number" min="1" /><FieldError :errors="errors.cycle" /></Field><Field :data-invalid="Boolean(errors.creditos)"><FieldLabel :for="`edit-subject-credits-${record.id}`">Créditos</FieldLabel><Input :id="`edit-subject-credits-${record.id}`" v-model="form.creditos" type="number" min="0" step="0.01" /><FieldError :errors="errors.creditos" /></Field><Field :data-invalid="Boolean(errors.horas_totales)"><FieldLabel :for="`edit-subject-hours-${record.id}`">Horas totales</FieldLabel><Input :id="`edit-subject-hours-${record.id}`" v-model="form.horas_totales" type="number" min="0" /><FieldError :errors="errors.horas_totales" /></Field></template>
        <template v-else-if="entity === 'programacion_asignatura'"><Field :data-invalid="Boolean(errors.subject_id)"><FieldLabel :for="`edit-scheduled-subject-subject-${record.id}`" required>Materia de la carrera</FieldLabel><Select v-model="form.subject_id" required><SelectTrigger :id="`edit-scheduled-subject-subject-${record.id}`"><SelectValue placeholder="Seleccione una materia" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.activeSubjects ?? []" :key="item.id" :value="item.id">{{ item.codigo_asignatura }} · {{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.subject_id" /></Field><Field :data-invalid="Boolean(errors.period_id)"><FieldLabel :for="`edit-scheduled-subject-period-${record.id}`" required>Periodo académico</FieldLabel><Select v-model="form.period_id" required><SelectTrigger :id="`edit-scheduled-subject-period-${record.id}`"><SelectValue placeholder="Seleccione un periodo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in planningPeriods" :key="item.id" :value="item.id">{{ item.code ?? item.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.period_id" /></Field></template>
        <template v-else-if="entity === 'paralelo'"><Field :data-invalid="Boolean(errors.scheduled_subject_id)"><FieldLabel :for="`edit-parallel-scheduled-subject-${record.id}`" required>Materia programada</FieldLabel><Select v-model="form.scheduled_subject_id" required><SelectTrigger :id="`edit-parallel-scheduled-subject-${record.id}`"><SelectValue placeholder="Seleccione una materia programada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.scheduledSubjects ?? []" :key="item.id" :value="item.id">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.scheduled_subject_id" /></Field><Field :data-invalid="Boolean(errors.code)"><FieldLabel :for="`edit-parallel-code-${record.id}`" required>Código de paralelo</FieldLabel><Input :id="`edit-parallel-code-${record.id}`" v-model="form.code" required /><FieldError :errors="errors.code" /></Field><Field :data-invalid="Boolean(errors.shift)"><FieldLabel :for="`edit-parallel-shift-${record.id}`">Jornada</FieldLabel><Select v-model="form.shift"><SelectTrigger :id="`edit-parallel-shift-${record.id}`"><SelectValue placeholder="Seleccione la jornada" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="shift in SHIFTS" :key="shift.value" :value="shift.value">{{ shift.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.shift" /></Field></template>
        <template v-else><Field :data-invalid="Boolean(errors.user_id)"><FieldLabel :for="`edit-teacher-user-${record.id}`" required>Docente</FieldLabel><Select v-model="form.user_id" required><SelectTrigger :id="`edit-teacher-user-${record.id}`"><SelectValue placeholder="Seleccione un docente" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.teacherUsers ?? []" :key="item.id" :value="item.id">{{ item.name }} · {{ item.email }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.user_id" /></Field><Field :data-invalid="Boolean(errors.parallel_id)"><FieldLabel :for="`edit-teacher-parallel-${record.id}`" required>Materia, periodo y paralelo</FieldLabel><Select v-model="form.parallel_id" required><SelectTrigger :id="`edit-teacher-parallel-${record.id}`"><SelectValue placeholder="Seleccione un paralelo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="item in options.parallels ?? []" :key="item.id" :value="item.id">{{ item.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.parallel_id" /></Field></template>
        <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
    </FieldGroup></form></template>
</FormSheet></template>
