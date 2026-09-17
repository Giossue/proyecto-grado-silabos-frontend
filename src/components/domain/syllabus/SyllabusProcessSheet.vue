<script setup lang="ts">
import { CalendarPlus, Check } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createProcess, updateProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = withDefaults(defineProps<{ template: string | null; periods: { id: string; codigo: string }[]; process?: { id: string; name: string; period_id: string; period_name: string; starts_at: string; due_at: string } | null; display?: 'button' | 'menu'; disabled?: boolean }>(), { process: null, display: 'button', disabled: false });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ period_id: '', starts_at: '', due_at: '' });
watch(open, (value) => { if (value) { form.value = { period_id: props.process?.period_id ?? '', starts_at: props.process?.starts_at.slice(0, 10) ?? '', due_at: props.process?.due_at.slice(0, 10) ?? '' }; errors.value = {}; } });
const submit = async (): Promise<void> => { if (props.disabled) return; processing.value = true; errors.value = {}; try { const result = props.process ? await updateProcess(props.process.id, form.value) : await createProcess(form.value); open.value = false; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet v-model:open="open" :disabled="props.disabled" trigger-label="Nuevo proceso" :title="process ? `Editar ${process.name}` : 'Preparar proceso de sílabos'" description="El calendario institucional obliga a todas las carreras: fija las fechas de inicio y entrega con las que se elaboran los sílabos. Cada coordinación convoca a su carrera dentro de este proceso." :show-trigger="display !== 'menu'">
    <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup><Field v-if="errors.process" data-invalid><FieldError :errors="errors.process" /></Field><Field :data-invalid="Boolean(errors.period_id)"><FieldLabel for="process-period" required>Periodo académico</FieldLabel><Select v-model="form.period_id" required><SelectTrigger id="process-period"><SelectValue placeholder="Seleccione un periodo" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="period in periods" :key="period.id" :value="period.id">{{ period.codigo }}</SelectItem></SelectGroup></SelectContent></Select><p v-if="process" class="text-sm text-muted-foreground">No se puede cambiar si ya existen convocatorias.</p><FieldError :errors="errors.period_id" /></Field><Field :data-invalid="Boolean(errors.starts_at)"><FieldLabel for="process-starts" required>Inicio de la elaboración</FieldLabel><DatePicker id="process-starts" v-model="form.starts_at" required /><FieldError :errors="errors.starts_at" /></Field><Field :data-invalid="Boolean(errors.due_at)"><FieldLabel for="process-due" required>Fecha límite de entrega</FieldLabel><DatePicker id="process-due" v-model="form.due_at" required /><FieldError :errors="errors.due_at" /></Field><FormSheetActions :close="close" :processing="processing" :icon="process ? Check : CalendarPlus" :label="process ? 'Guardar cambios' : 'Preparar proceso'" /></FieldGroup></form></template>
</FormSheet></template>
