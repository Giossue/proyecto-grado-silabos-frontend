<script setup lang="ts">
import { CalendarClock } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { extendProcessDeadline, type SyllabusProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
import DatePicker from '@/components/DatePicker.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { formatDateDisplay } from '@/lib/dateDisplay';

const props = withDefaults(defineProps<{ process: SyllabusProcess; display?: 'button' | 'menu' }>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ due_at: '' });
const ordinal = computed(() => `Prórroga ${Math.min(props.process.extensions_used + 1, props.process.extensions_max)} de ${props.process.extensions_max}`);
const limit = computed(() => formatDateDisplay(props.process.extension_limit_on, { dateStyle: 'medium' }));
// Se reinicia al abrir: al cerrar, la fecha elegida sigue visible mientras el panel se desliza.
watch(open, (value) => {
  if (!value) return;
  form.value = { due_at: '' };
  errors.value = {};
});

const submit = async (): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try {
    const result = await extendProcessDeadline(props.process.id, form.value);
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
          <Field :data-invalid="Boolean(errors.due_at)">
            <FieldLabel for="extension-due" required>Nueva fecha límite de entrega</FieldLabel>
            <DatePicker id="extension-due" v-model="form.due_at" required :max-value="process.extension_limit_on" :aria-invalid="Boolean(errors.due_at)" />
            <FieldDescription>Debe ser posterior a la fecha límite vigente</FieldDescription>
            <FieldDescription>Hasta el último día de clases: {{ limit }}</FieldDescription>
            <FieldError :errors="[...(errors.due_at ?? []), ...(errors.process ?? [])]" />
          </Field>
          <FormSheetActions :close="close" :processing="processing" :icon="CalendarClock" label="Prorrogar entrega" />
        </FieldGroup>
      </form>
    </template>
  </FormSheet>
</template>
