<script setup lang="ts">
import { CalendarPlus } from '@lucide/vue';
import { getLocalTimeZone, today } from '@internationalized/date';
import { computed, ref, watch } from 'vue';
import { createProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AcademicPeriod = { id: string; codigo: string; starts_on?: string; ends_on?: string };

const props = withDefaults(defineProps<{
  template: string | null;
  periods: { id: string; codigo: string }[];
  period?: AcademicPeriod | null;
  triggerLabel?: string;
  display?: 'button' | 'menu';
  disabled?: boolean;
}>(), {
  period: null,
  triggerLabel: 'Nuevo proceso',
  display: 'button',
  disabled: false,
});
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ period_id: '', starts_at: '', due_at: '' });
watch(open, (value) => {
  if (value) {
    form.value = {
      period_id: props.period?.id ?? '',
      starts_at: '',
      due_at: '',
    };
    errors.value = {};
  }
});
const todayIso = today(getLocalTimeZone()).toString();
const periodEnd = computed(() => props.period?.ends_on?.slice(0, 10));
const dueMinimum = computed(() => (form.value.starts_at > todayIso ? form.value.starts_at : todayIso));
const submit = async (): Promise<void> => {
  if (props.disabled) return;
  processing.value = true;
  errors.value = {};
  try {
    const result = await createProcess(form.value);
    open.value = false;
    emit('saved', result.message);
  } catch (reason) {
    errors.value = reason instanceof ApiError ? reason.errors : {};
  } finally {
    processing.value = false;
  }
};
</script>

<template>
  <FormSheet
    v-model:open="open"
    :disabled="props.disabled"
    :trigger-label="triggerLabel"
    title="Abrir convocatoria institucional"
    :description="period ? `El período ${period.codigo} quedará vinculado a la convocatoria institucional abierta. Elija las fechas de elaboración que heredarán las coordinaciones junto con la plantilla.` : 'El calendario institucional obliga a todas las carreras: fija las fechas de inicio y entrega con las que se elaboran los sílabos. Cada coordinación inicia el alcance de su carrera dentro de esta convocatoria.'"
    :show-trigger="display !== 'menu'"
  >
    <template #default="{ close }">
      <form @submit.prevent="submit">
        <FieldGroup>
          <Field v-if="errors.process" data-invalid><FieldError :errors="errors.process" /></Field>
          <Field v-if="period">
            <FieldLabel>Periodo académico</FieldLabel>
            <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">{{ period.codigo }}</div>
            <p class="text-sm text-muted-foreground">Se fija desde el período seleccionado y no se vuelve a elegir aquí.</p>
          </Field>
          <Field v-else :data-invalid="Boolean(errors.period_id)">
            <FieldLabel for="process-period" required>Periodo académico</FieldLabel>
            <Select v-model="form.period_id" required>
              <SelectTrigger id="process-period"><SelectValue placeholder="Seleccione un periodo" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="item in periods" :key="item.id" :value="item.id">{{ item.codigo }}</SelectItem></SelectGroup></SelectContent>
            </Select>
            <FieldError :errors="errors.period_id" />
          </Field>
          <Field :data-invalid="Boolean(errors.starts_at)">
            <FieldLabel for="process-starts" required>Inicio de la elaboración</FieldLabel>
            <DatePicker id="process-starts" v-model="form.starts_at" :min-value="todayIso" :max-value="periodEnd" required :aria-invalid="Boolean(errors.starts_at)" />
            <p class="text-sm text-muted-foreground">Elija cuándo comienza la elaboración; no se copia el inicio de clases.</p>
            <FieldError :errors="errors.starts_at" />
          </Field>
          <Field :data-invalid="Boolean(errors.due_at)">
            <FieldLabel for="process-due" required>Fecha límite de entrega</FieldLabel>
            <DatePicker id="process-due" v-model="form.due_at" :min-value="dueMinimum" :max-value="periodEnd" required :aria-invalid="Boolean(errors.due_at)" />
            <p class="text-sm text-muted-foreground">Esta fecha se heredará en la convocatoria de cada carrera.</p>
            <FieldError :errors="errors.due_at" />
          </Field>
          <FormSheetActions :close="close" :processing="processing" :icon="CalendarPlus" label="Abrir convocatoria" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
