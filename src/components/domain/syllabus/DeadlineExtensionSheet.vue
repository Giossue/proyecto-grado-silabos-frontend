<script setup lang="ts">
import { CalendarClock } from '@lucide/vue';
import { ref } from 'vue';
import { extendProcessDeadline } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const props = withDefaults(defineProps<{ processId: string; display?: 'button' | 'menu' }>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ stage: 'borrador', due_at: '', reason: '' });
const submit = async (): Promise<void> => { processing.value = true; errors.value = {}; try { const result = await extendProcessDeadline(props.processId, form.value); open.value = false; form.value = { stage: 'borrador', due_at: '', reason: '' }; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet v-model:open="open" trigger-label="Prorrogar plazo" :show-trigger="display !== 'menu'" title="Prorrogar el plazo" description="La prórroga es una excepción: solo se puede mover la fecha hacia adelante, alcanza a todas las convocatorias del proceso y el motivo queda registrado en auditoría junto con la fecha anterior."><template #trigger><Button variant="outline">Prorrogar plazo</Button></template><template #default="{ close }"><form @submit.prevent="submit"><FieldGroup><Field :data-invalid="Boolean(errors.stage)"><FieldLabel for="extension-stage" required>Etapa</FieldLabel><Select v-model="form.stage" required><SelectTrigger id="extension-stage"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="borrador">Entrega del borrador</SelectItem><SelectItem value="inicio">Inicio de la elaboración</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.stage" /></Field><Field :data-invalid="Boolean(errors.due_at)"><FieldLabel for="extension-due" required>Nueva fecha</FieldLabel><DatePicker id="extension-due" v-model="form.due_at" required /><FieldError :errors="errors.due_at" /></Field><Field :data-invalid="Boolean(errors.reason)"><FieldLabel for="extension-reason" required>Motivo</FieldLabel><Textarea id="extension-reason" v-model="form.reason" rows="3" placeholder="Relevo de docente por licencia; el reemplazo asumió el 12 de octubre." required /><FieldError :errors="[...(errors.reason ?? []), ...(errors.process ?? [])]" /></Field><FormSheetActions :close="close" :processing="processing" :icon="CalendarClock" label="Prorrogar" /></FieldGroup></form></template></FormSheet></template>
