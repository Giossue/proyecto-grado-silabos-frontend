<script setup lang="ts">
import { CalendarClock, RefreshCcw } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { extendProcessDeadline, type SyllabusProcess, type SyllabusStateCounts } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import SyllabusStateCountsTable from '@/components/domain/syllabus/SyllabusStateCountsTable.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { matchesPhrase } from '@/lib/confirmPhrase';
import { formatDateDisplay } from '@/lib/dateDisplay';

const TEMPLATE_PHRASE = 'adaptar sílabos';

const props = withDefaults(defineProps<{ process: SyllabusProcess; display?: 'button' | 'menu' }>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ due_at: '' });
// Reabrir una convocatoria finalizada cuya plantilla cambió: el servidor pide confirmar que los sílabos se adapten.
const templateImpact = ref<SyllabusStateCounts | null>(null);
const typed = ref('');
const finalized = computed(() => props.process.state === 'cerrado');
const phraseReady = computed(() => templateImpact.value === null || matchesPhrase(typed.value, TEMPLATE_PHRASE));
const submitLabel = computed(() => {
  if (templateImpact.value) return 'Prorrogar y adaptar sílabos';
  return finalized.value ? 'Prorrogar y reabrir' : 'Prorrogar entrega';
});
const ordinal = computed(() => `Prórroga ${Math.min(props.process.extensions_used + 1, props.process.extensions_max)} de ${props.process.extensions_max}`);
const limit = computed(() => formatDateDisplay(props.process.extension_limit_on, { dateStyle: 'medium' }));
// Se reinicia al abrir: al cerrar, lo elegido sigue visible mientras el panel se desliza.
watch(open, (value) => {
  if (!value) return;
  form.value = { due_at: '' };
  errors.value = {};
  templateImpact.value = null;
  typed.value = '';
});

const submit = async (): Promise<void> => {
  if (!phraseReady.value) return;
  processing.value = true;
  errors.value = {};
  try {
    const result = await extendProcessDeadline(props.process.id, templateImpact.value
      ? { ...form.value, confirmar_rehacer: true }
      : form.value);
    open.value = false;
    emit('saved', result.message);
  } catch (reason) {
    const counts = reason instanceof ApiError && reason.payload.code === 'plantilla_cambiada' ? reason.payload.counts : null;
    if (counts && typeof counts === 'object') {
      templateImpact.value = counts as SyllabusStateCounts;
      typed.value = '';
      return;
    }
    errors.value = reason instanceof ApiError ? reason.errors : {};
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <FormSheet
    v-model:open="open"
    trigger-label="Prorrogar plazo"
    :show-trigger="display !== 'menu'"
    title="Prorrogar el plazo de entrega"
    description="Mueve la fecha límite de entrega hacia adelante para todas las convocatorias"
  >
    <template #trigger><Button variant="outline">Prorrogar plazo</Button></template>
    <template #default="{ close }">
      <form @submit.prevent="submit">
        <FieldGroup>
          <p class="text-sm font-medium">{{ ordinal }}</p>
          <Alert v-if="finalized"><RefreshCcw aria-hidden="true" /><AlertDescription>Al prorrogar, la convocatoria se vuelve a abrir con la nueva fecha</AlertDescription></Alert>
          <Field :data-invalid="Boolean(errors.due_at)">
            <FieldLabel for="extension-due" required>Nueva fecha límite de entrega</FieldLabel>
            <DatePicker id="extension-due" v-model="form.due_at" required :max-value="process.extension_limit_on" :aria-invalid="Boolean(errors.due_at)" />
            <FieldDescription>Debe ser posterior a la fecha límite vigente</FieldDescription>
            <FieldDescription>Hasta el último día de clases: {{ limit }}</FieldDescription>
            <FieldError :errors="[...(errors.due_at ?? []), ...(errors.process ?? [])]" />
          </Field>
          <template v-if="templateImpact">
            <p class="text-sm">La plantilla cambió después de finalizar la convocatoria. Al reabrirla, los sílabos de este período se adaptan a la plantilla nueva: se conserva lo escrito en los campos que siguen encajando y los enviados o aprobados vuelven a borrador, sin su historial ni sus firmas</p>
            <SyllabusStateCountsTable :counts="templateImpact" caption="Cantidad de sílabos que se adaptan, por estado" />
            <ConfirmPhrase id="extension-template-confirm" v-model="typed" :phrase="TEMPLATE_PHRASE" />
          </template>
          <FormSheetActions :close="close" :processing="processing" :icon="CalendarClock" :label="submitLabel" :destructive="templateImpact !== null" :disabled="!phraseReady" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
