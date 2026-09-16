<script setup lang="ts">
import { Plus } from '@lucide/vue';
import { reactive, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { createSource } from '@/api/sources';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const emit = defineEmits<{ created: [sourceId: string, message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const form = reactive({ nombre: '', description: '' });
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
watch(open, (value) => { if (value) { Object.assign(form, { nombre: '', description: '' }); errors.value = {}; } });
const submit = async (close: () => void): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try {
    const result = await createSource({ nombre: form.nombre, description: form.description || undefined });
    close();
    emit('created', result.source_id, result.message);
  } catch (reason) {
    if (reason instanceof ApiError) errors.value = reason.errors;
  } finally { processing.value = false; }
};
</script>

<template>
  <FormSheet v-model:open="open" trigger-label="Nueva fuente" title="Nueva fuente académica" description="Identifique el documento. Su contenido se redacta después, en la página de la fuente.">
    <template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
      <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="source-name" required>Nombre</FieldLabel><Input id="source-name" v-model="form.nombre" placeholder="Ej. Reglamento de régimen académico" required :aria-invalid="Boolean(errors.nombre)" /><FieldError :errors="errors.nombre" /></Field>
      <Field :data-invalid="Boolean(errors.description)"><FieldLabel for="source-description">Descripción</FieldLabel><Textarea id="source-description" v-model="form.description" :aria-invalid="Boolean(errors.description)" /><FieldError :errors="errors.description" /></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="Plus" label="Crear fuente" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
