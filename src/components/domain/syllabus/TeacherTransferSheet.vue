<script setup lang="ts">
import { UserRoundCog } from '@lucide/vue';
import { computed, ref } from 'vue';
import { ApiError } from '@/api/client';
import { transferTeacher } from '@/api/reviews';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Teacher = { id: string; nombre: string };
const props = defineProps<{ syllabusId: string; state: string; current: Teacher[]; candidates: Teacher[] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const outgoing = ref(props.current[0]?.id ?? '');
const incoming = ref('');
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const replacements = computed(() => props.candidates.filter((teacher) => teacher.id !== outgoing.value));
const discardsDraft = computed(() => props.state === 'borrador');
const submit = async (close: () => void): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try { const result = await transferTeacher(props.syllabusId, outgoing.value, incoming.value); close(); emit('saved', result.message); }
  catch (failure) { if (failure instanceof ApiError) errors.value = failure.errors; }
  finally { processing.value = false; }
};
</script>

<template>
  <FormSheet trigger-label="Relevar docente" title="Relevar al docente responsable" description="Releva a quien sale y asigna a quien entra sobre los mismos paralelos, en una sola operación."><template #trigger><Button><UserRoundCog data-icon="inline-start" aria-hidden="true" />Relevar docente</Button></template><template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
    <Alert v-if="discardsDraft" variant="destructive"><AlertDescription>El borrador que no se ha enviado se descartará y el docente entrante empezará limpio. La operación no se deshace; el avance perdido queda en auditoría.</AlertDescription></Alert>
    <Field :data-invalid="Boolean(errors.outgoing_user_id)"><FieldLabel for="transfer-outgoing" required>Docente saliente</FieldLabel><Select v-model="outgoing" required><SelectTrigger id="transfer-outgoing" :aria-invalid="Boolean(errors.outgoing_user_id)"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="teacher in current" :key="teacher.id" :value="teacher.id">{{ teacher.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.outgoing_user_id" /></Field>
    <Field :data-invalid="Boolean(errors.incoming_user_id)"><FieldLabel for="transfer-incoming" required>Docente entrante</FieldLabel><Select v-model="incoming" required><SelectTrigger id="transfer-incoming" :aria-invalid="Boolean(errors.incoming_user_id)"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="teacher in replacements" :key="teacher.id" :value="teacher.id">{{ teacher.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.incoming_user_id" /></Field>
    <FormSheetActions :close="close" :processing="processing" :icon="UserRoundCog" label="Registrar relevo" :disabled="!outgoing || !incoming" />
  </FieldGroup></form></template></FormSheet>
</template>
