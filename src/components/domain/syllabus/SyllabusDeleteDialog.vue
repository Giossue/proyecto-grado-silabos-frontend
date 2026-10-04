<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { deleteSyllabus } from '@/api/reviews';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FieldError } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{ syllabusId: string; subject: string }>();
const emit = defineEmits<{ deleted: [message: string] }>();
const open = ref(false);
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const submit = async (): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try { const result = await deleteSyllabus(props.syllabusId); open.value = false; emit('deleted', result.message); }
  catch (failure) { if (failure instanceof ApiError) errors.value = failure.errors; }
  finally { processing.value = false; }
};
</script>

<template>
  <Dialog v-model:open="open"><DialogTrigger as-child><Button variant="destructive"><Trash2 data-icon="inline-start" aria-hidden="true" />Eliminar sílabo</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Eliminar «{{ subject }}»</DialogTitle><DialogDescription>Se elimina el sílabo aprobado con todo su historial: revisiones, aprobación, PDF y firmas. No se puede deshacer. El docente recibe aviso y empieza de cero con la malla y la plantilla actuales.</DialogDescription></DialogHeader><form class="flex flex-col gap-4" @submit.prevent="submit"><FieldError :errors="errors.syllabus" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="submit" variant="destructive" :disabled="processing"><Spinner v-if="processing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar definitivamente</Button></DialogFooter></form></DialogContent></Dialog>
</template>
