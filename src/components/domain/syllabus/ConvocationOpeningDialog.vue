<script setup lang="ts">
import { Play } from '@lucide/vue';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createConvocation } from '@/api/convocations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
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

const sourceIds = ref<string[]>([]);
const processing = ref(false);
const error = ref<string | null>(null);
const fieldErrors = ref<Record<string, string[]>>({});

watch(() => props.open, (open) => {
  if (!open) return;
  sourceIds.value = [];
  error.value = null;
  fieldErrors.value = {};
});

const toggleSource = (id: string, checked: boolean | 'indeterminate'): void => {
  sourceIds.value = checked === true
    ? [...new Set([...sourceIds.value, id])]
    : sourceIds.value.filter((value) => value !== id);
};

const submit = async (): Promise<void> => {
  processing.value = true;
  error.value = null;
  fieldErrors.value = {};
  try {
    const result = await createConvocation(props.processId, sourceIds.value);
    emit('update:open', false);
    emit('opened', result.message, result.convocation_id);
  } catch (reason) {
    if (reason instanceof ApiError) {
      error.value = reason.message;
      fieldErrors.value = reason.errors;
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
          Se usarán la plantilla y las fechas institucionales del período {{ period }}. Seleccione las fuentes que acompañarán a los sílabos.
        </DialogDescription>
      </DialogHeader>
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <FieldSet>
          <FieldLegend>Fuentes académicas</FieldLegend>
          <Field v-for="source in availableSources" :key="source.id" orientation="horizontal">
            <Checkbox :id="`convocation-source-${source.id}`" :model-value="sourceIds.includes(source.id)" @update:model-value="toggleSource(source.id, $event)" />
            <FieldLabel :for="`convocation-source-${source.id}`">{{ source.name }}</FieldLabel>
          </Field>
          <FieldError :errors="fieldErrors.source_ids" />
        </FieldSet>
        <Alert v-if="error && Object.keys(fieldErrors).length === 0" variant="destructive">
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose as-child><Button type="button" variant="outline" :disabled="processing">Cancelar</Button></DialogClose>
          <Button type="submit" :disabled="processing || sourceIds.length === 0">
            <Spinner v-if="processing" data-icon="inline-start" />
            <Play v-else data-icon="inline-start" aria-hidden="true" />
            Abrir convocatoria
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
