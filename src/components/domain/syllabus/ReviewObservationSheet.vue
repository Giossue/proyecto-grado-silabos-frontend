<script setup lang="ts">
import { MessageSquarePlus } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { addObservation } from '@/api/reviews';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type ReviewSection = { key: string; title: string; blocks: Array<{ fields: Array<{ key: string; label: string }> }> };
const props = defineProps<{ revisionId: string; sections: ReviewSection[] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = ref(false);
const selectedSection = ref('__document');
const selectedField = ref('__section');
const content = ref('');
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
const currentSection = computed(() => props.sections.find((section) => section.key === selectedSection.value));
const currentFields = computed(() => currentSection.value?.blocks.flatMap((block) => block.fields) ?? []);
const chooseSection = (value: unknown): void => { if (typeof value === 'string') { selectedSection.value = value; selectedField.value = '__section'; } };
watch(open, (value) => { if (!value) { selectedSection.value = '__document'; selectedField.value = '__section'; content.value = ''; errors.value = {}; } });
const submit = async (close: () => void): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try {
    const result = await addObservation(props.revisionId, {
      content: content.value,
      ...(selectedSection.value === '__document' ? {} : { section_key: selectedSection.value }),
      ...(selectedField.value === '__section' ? {} : { field_key: selectedField.value }),
    });
    close();
    emit('saved', result.message);
  } catch (reason) { if (reason instanceof ApiError) errors.value = reason.errors; }
  finally { processing.value = false; }
};
</script>

<template>
  <FormSheet v-model:open="open" trigger-label="Nueva observación" title="Nueva observación" description="Vincule la observación al documento completo, a una sección o a un campo de esta revisión.">
    <template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
      <Field :data-invalid="Boolean(errors.location || errors.section_key)"><FieldLabel for="observation-location">Ubicación</FieldLabel><Select :model-value="selectedSection" @update:model-value="chooseSection"><SelectTrigger id="observation-location" :aria-invalid="Boolean(errors.location || errors.section_key)"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="__document">Documento completo</SelectItem><SelectItem v-for="section in sections" :key="section.key" :value="section.key">{{ section.title }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="[...(errors.location ?? []), ...(errors.section_key ?? [])]" /></Field>
      <Field v-if="currentSection" :data-invalid="Boolean(errors.field_key)"><FieldLabel for="observation-field">Campo (opcional)</FieldLabel><Select v-model="selectedField"><SelectTrigger id="observation-field" :aria-invalid="Boolean(errors.field_key)"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="__section">Sección completa</SelectItem><SelectItem v-for="field in currentFields" :key="field.key" :value="field.key">{{ field.label }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.field_key" /></Field>
      <Field :data-invalid="Boolean(errors.content)"><FieldLabel for="observation-content" required>Observación</FieldLabel><Textarea id="observation-content" v-model="content" rows="5" required placeholder="Indique qué debe revisarse y cómo comprobarlo." :aria-invalid="Boolean(errors.content)" /><FieldError :errors="errors.content" /></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="MessageSquarePlus" label="Registrar observación" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
