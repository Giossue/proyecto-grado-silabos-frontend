<script setup lang="ts">
import { Play } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createConvocation } from '@/api/convocations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

const props = defineProps<{
  open: boolean;
  processId: string;
  period: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  opened: [message: string, convocationId: string];
}>();

const processing = ref(false);
const error = ref<string | null>(null);
const warnings = ref<string[]>([]);

watch(() => props.open, (open) => {
  if (!open) return;
  error.value = null;
  warnings.value = [];
});

const submit = async (): Promise<void> => {
  processing.value = true;
  error.value = null;
  warnings.value = [];
  try {
    const result = await createConvocation(props.processId);
    emit('update:open', false);
    emit('opened', result.message, result.convocation_id);
  } catch (reason) {
    if (reason instanceof ApiError) {
      warnings.value = Object.values(reason.errors).flat();
      error.value = warnings.value.length > 1 ? 'Todavía no puede abrir la convocatoria:' : (warnings.value[0] ?? reason.message);
    } else {
      error.value = 'No se pudo abrir la convocatoria';
    }
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <Dialog :open="open" @update:open="(value) => { if (!processing) emit('update:open', value); }">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Abrir convocatoria de la carrera</DialogTitle>
        <DialogDescription>Los docentes podrán elaborar sus sílabos hasta la fecha de entrega</DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <Alert v-if="error" variant="destructive">
          <AlertDescription>
            <p>{{ error }}</p>
            <ul v-if="warnings.length > 1" class="list-disc pl-5">
              <li v-for="warning in warnings" :key="warning">{{ warning }}</li>
            </ul>
          </AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose>
          <Button type="submit" :disabled="processing">
            <Spinner v-if="processing" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" aria-hidden="true" />
            Abrir convocatoria
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
