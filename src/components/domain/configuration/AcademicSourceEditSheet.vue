<script setup lang="ts">
import { Check } from '@lucide/vue';
import { reactive, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { updateSource, type Source } from '@/api/sources';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const props = defineProps<{ source: Pick<Source, 'id' | 'name' | 'description'>; display?: 'button' | 'menu' }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const form = reactive({ nombre: '', description: '' });
const errors = ref<Record<string, string[]>>({});
const processing = ref(false);
watch(open, (value) => { if (value) { Object.assign(form, { nombre: props.source.name, description: props.source.description ?? '' }); errors.value = {}; } }, { immediate: true });
const submit = async (close: () => void): Promise<void> => {
  processing.value = true;
  errors.value = {};
  try {
    const result = await updateSource(props.source.id, { nombre: form.nombre, description: form.description || undefined });
    close();
    emit('saved', result.message);
  } catch (reason) {
    if (reason instanceof ApiError) errors.value = reason.errors;
  } finally { processing.value = false; }
};
</script>

<template>
  <FormSheet v-model:open="open" trigger-label="Editar fuente" :show-trigger="props.display !== 'menu'" title="Editar fuente académica" description="Cambie el nombre o la descripción. El contenido se edita en la propia página.">
    <template #trigger><Button variant="outline">Editar fuente</Button></template>
    <template #default="{ close }"><form @submit.prevent="submit(close)"><FieldGroup>
      <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="source-edit-name" required>Nombre</FieldLabel><Input id="source-edit-name" v-model="form.nombre" placeholder="Ej. Reglamento de régimen académico" required :aria-invalid="Boolean(errors.nombre)" /><FieldError :errors="errors.nombre" /></Field>
      <Field :data-invalid="Boolean(errors.description)"><FieldLabel for="source-edit-description">Descripción</FieldLabel><Textarea id="source-edit-description" v-model="form.description" :aria-invalid="Boolean(errors.description)" /><FieldError :errors="errors.description" /></Field>
      <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
    </FieldGroup></form></template>
  </FormSheet>
</template>
