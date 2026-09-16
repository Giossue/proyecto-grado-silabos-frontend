<script setup lang="ts">
import { RotateCcw } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { resetSyllabus } from '@/api/reviews';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ syllabusId: string; subject: string }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = ref(false);
const reason = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const submit = async (): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try { const result = await resetSyllabus(props.syllabusId, reason.value); open.value = false; emit('saved', result.message); }
  catch (failure) { if (failure instanceof ApiError) errors.value = failure.errors; }
  finally { processing.value = false; }
};
</script>

<template>
  <Dialog v-model:open="open"><DialogTrigger as-child><Button variant="outline">Reiniciar sílabo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Reiniciar «{{ subject }}»</DialogTitle><DialogDescription>Se descarta el borrador actual y el sílabo vuelve a «Sin iniciar» con la malla y la plantilla tal como están hoy. Las revisiones ya enviadas se conservan como historial. El docente recibe aviso y el motivo queda en auditoría.</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit"><Field :data-invalid="Boolean(errors.reason)"><FieldLabel for="syllabus-reset-reason" required>Motivo</FieldLabel><Textarea id="syllabus-reset-reason" v-model="reason" rows="3" :aria-invalid="Boolean(errors.reason)" placeholder="La malla cambió las horas de la materia después de la entrega; se rehace sobre la base corregida." required /><FieldError :errors="[...(errors.reason ?? []), ...(errors.syllabus ?? [])]" /></Field><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" data-icon="inline-start" /><RotateCcw v-else data-icon="inline-start" aria-hidden="true" />Reiniciar y descartar</Button></DialogFooter></form></DialogContent></Dialog>
</template>
