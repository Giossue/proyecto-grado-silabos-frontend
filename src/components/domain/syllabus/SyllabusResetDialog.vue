<script setup lang="ts">
import { RotateCcw } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { resetSyllabus } from '@/api/reviews';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ syllabusId: string; subject: string }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = ref(false);
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const submit = async (): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try { const result = await resetSyllabus(props.syllabusId); open.value = false; emit('saved', result.message); }
  catch (failure) { if (failure instanceof ApiError) errors.value = failure.errors; }
  finally { processing.value = false; }
};
</script>

<template>
  <Dialog v-model:open="open"><DialogTrigger as-child><Button variant="outline"><RotateCcw data-icon="inline-start" aria-hidden="true" />Reiniciar sílabo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Reiniciar «{{ subject }}»</DialogTitle><DialogDescription>Se descarta el borrador actual y el sílabo vuelve a «Sin iniciar» con la malla y la plantilla tal como están hoy. Las revisiones ya enviadas se conservan como historial. El docente recibe aviso.</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit"><FieldError :errors="errors.syllabus" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" data-icon="inline-start" /><RotateCcw v-else data-icon="inline-start" aria-hidden="true" />Reiniciar y descartar</Button></DialogFooter></form></DialogContent></Dialog>
</template>
