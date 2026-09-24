<script setup lang="ts">
import { Play } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
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
  availableSources: Array<{ id: string; name: string }>;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  opened: [message: string, convocationId: string];
}>();

const processing = ref(false);
const error = ref<string | null>(null);
const hasSources = computed(() => props.availableSources.length > 0);

watch(() => props.open, (open) => {
  if (!open) return;
  error.value = null;
});

const submit = async (): Promise<void> => {
  processing.value = true;
  error.value = null;
  try {
    const result = await createConvocation(props.processId);
    emit('update:open', false);
    emit('opened', result.message, result.convocation_id);
  } catch (reason) {
    if (reason instanceof ApiError) {
      error.value = reason.message;
    } else {
      error.value = 'No se pudo abrir la convocatoria.';
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
        <DialogDescription>
          Se usarán la plantilla, las fechas institucionales del período {{ period }} y todas las fuentes académicas activas de la carrera.
        </DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <p v-if="hasSources" class="text-sm text-muted-foreground">
          Fuentes que usará la IA: {{ availableSources.map((source) => source.name).join(', ') }}.
        </p>
        <Alert v-else variant="destructive">
          <AlertDescription>Falta registrar al menos una fuente académica activa en la carrera.</AlertDescription>
        </Alert>
        <Alert v-if="error" variant="destructive">
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose>
          <Button type="submit" :disabled="processing || !hasSources">
            <Spinner v-if="processing" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" aria-hidden="true" />
            Abrir convocatoria
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
