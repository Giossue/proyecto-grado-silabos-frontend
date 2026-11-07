<script setup lang="ts">
import { CalendarClock, RefreshCcw } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { extendProcessDeadline, type PendingChangeCounts, type SyllabusProcess, type SyllabusStateCounts } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import FormModal from '@/components/domain/FormModal.vue';
import FormDialogActions from '@/components/domain/FormDialogActions.vue';
import SyllabusStateCountsTable from '@/components/domain/syllabus/SyllabusStateCountsTable.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { matchesPhrase } from '@/lib/confirmPhrase';
import { formatDateDisplay } from '@/lib/dateDisplay';

const TEMPLATE_PHRASE = 'adaptar sílabos';
const PENDING_PHRASE = 'aplicar cambios';

const props = withDefaults(defineProps<{ process: SyllabusProcess; display?: 'button' | 'menu' }>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ due_at: '' });
// Reabrir una convocatoria finalizada cuya plantilla cambió: el servidor pide confirmar que los sílabos se adapten.
const templateImpact = ref<SyllabusStateCounts | null>(null);
const pendingImpact = ref<PendingChangeCounts | null>(null);
const typed = ref('');
const finalized = computed(() => props.process.state === 'cerrado');
const phrase = computed(() => (templateImpact.value ? TEMPLATE_PHRASE : PENDING_PHRASE));
const needsPhrase = computed(() => templateImpact.value !== null || pendingImpact.value !== null);
const phraseReady = computed(() => !needsPhrase.value || matchesPhrase(typed.value, phrase.value));
const pendingLines = computed(() => {
  const counts = pendingImpact.value;
  if (!counts) return [];
  return [
    { label: 'Vuelven a borrador, sin su historial ni sus firmas', total: counts.to_draft },
    { label: 'Se rehacen o se quitan, sin su contenido', total: counts.restarted },
    { label: 'Vuelven a Coordinación, sin sus aprobaciones', total: counts.to_coordination },
  ].filter((line) => line.total > 0);
});
const submitLabel = computed(() => {
  if (templateImpact.value) return 'Prorrogar y adaptar sílabos';
  if (pendingImpact.value) return 'Prorrogar y aplicar cambios';
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
  pendingImpact.value = null;
  typed.value = '';
});

const submit = async (): Promise<void> => {
  if (!phraseReady.value) return;
  processing.value = true;
  errors.value = {};
  try {
    const result = await extendProcessDeadline(props.process.id, {
      ...form.value,
      ...(templateImpact.value ? { confirmar_rehacer: true } : {}),
      ...(pendingImpact.value ? { confirmar_cambios: true } : {}),
    });
    open.value = false;
    emit('saved', result.message);
  } catch (reason) {
    const payload = reason instanceof ApiError ? reason.payload : null;
    if (payload?.code === 'plantilla_cambiada' || payload?.code === 'cambios_pendientes') {
      if (payload.code === 'plantilla_cambiada') templateImpact.value = payload.counts as SyllabusStateCounts;
      const pending = payload.code === 'cambios_pendientes' ? payload.counts : payload.pending_counts;
      if (pending) pendingImpact.value = pending as PendingChangeCounts;
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
  <FormModal
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
          </template>
          <template v-if="pendingImpact">
            <p class="text-sm">Mientras la convocatoria estuvo finalizada hubo cambios que ahora llegan a sus sílabos. Los demás se ponen al día sin cambiar de estado</p>
            <ul class="flex flex-col gap-1 text-sm">
              <li v-for="line in pendingLines" :key="line.label" class="flex justify-between gap-4"><span>{{ line.label }}</span><span class="font-medium tabular-nums">{{ line.total }}</span></li>
            </ul>
          </template>
          <ConfirmPhrase v-if="needsPhrase" id="extension-template-confirm" v-model="typed" :phrase="phrase" />
          <FormDialogActions :close="close" :processing="processing" :icon="CalendarClock" :label="submitLabel" :destructive="needsPhrase" :disabled="!phraseReady" />
        </FieldGroup>
      </form>
    </template>
  </FormModal>
</template>
