<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ApiError } from "@/api/client";
import {
  getCareerAiConfiguration,
  resetCareerAiConfiguration,
  saveCareerAiConfiguration,
  type CareerAiConfiguration,
} from "@/api/ai-configuration";
import PageFrame from '@/components/domain/PageFrame.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';

const data = ref<CareerAiConfiguration | null>(null);
const values = ref<Record<string, boolean>>({});
const loading = ref(true);
const saving = ref(false);
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const sections = computed(() => [
  ...new Set(data.value?.fields.map((field) => field.section) ?? []),
]);

const updateValue = (fieldId: string, value: boolean | 'indeterminate'): void => {
  values.value[fieldId] = value === true;
};

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    data.value = await getCareerAiConfiguration();
    values.value = Object.fromEntries(
      data.value.fields.map((field) => [field.id, field.effective]),
    );
  } finally {
    loading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (!data.value) return;
  saving.value = true;
  error.value = null;
  try {
    const result = await saveCareerAiConfiguration(
      data.value.fields
        .filter((field) => field.coordinator_configurable)
        .map((field) => ({
          field_id: field.id,
          enabled: values.value[field.id] ?? field.effective,
        })),
    );
    message.value = result.message;
    await load();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo guardar la configuración.";
  } finally {
    saving.value = false;
  }
};

const reset = async (): Promise<void> => {
  saving.value = true;
  error.value = null;
  try {
    const result = await resetCareerAiConfiguration();
    message.value = result.message;
    await load();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo restablecer la configuración.";
  } finally {
    saving.value = false;
  }
};

onMounted(() =>
  load().catch(() => {
    error.value = "No se pudo cargar la configuración de IA.";
  }),
);
</script>

<template>
  <PageFrame
    title="Configuración de IA"
    description="Decida qué campos puede consultar la IA para esta carrera. Administración define el valor inicial y cuáles permanecen bloqueados."
  >
    <template #actions>
      <Button v-if="data?.fields.length" type="button" variant="outline" :disabled="saving" @click="reset">Restablecer valores</Button>
      <Button v-if="data?.fields.length" type="submit" form="ai-configuration-form" :disabled="saving"><Spinner v-if="saving" />Guardar configuración</Button>
    </template>

    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <p v-if="loading && !data" class="text-sm text-muted-foreground" role="status">Cargando configuración de IA…</p>

    <form v-if="data" id="ai-configuration-form" class="flex flex-col gap-6" @submit.prevent="save">
      <Card v-if="!data.fields.length"><CardContent class="py-10 text-center text-sm text-muted-foreground">La plantilla no tiene campos configurables para IA.</CardContent></Card>
      <Card v-for="section in sections" v-else :key="section">
        <CardHeader><CardTitle>{{ section }}</CardTitle><CardDescription>Campos que la IA puede usar como contexto o revisar dentro de esta sección.</CardDescription></CardHeader>
        <CardContent class="divide-y p-0">
          <Field
            v-for="field in data.fields.filter((item) => item.section === section)"
            :key="field.id"
            orientation="horizontal"
            class="justify-between gap-4 px-6 py-4"
          >
            <div class="flex min-w-0 flex-col gap-1">
              <FieldLabel :for="`ai-field-${field.id}`">{{ field.label }}</FieldLabel>
              <p class="text-sm text-muted-foreground">
                {{ field.coordinator_configurable ? `Valor institucional: ${field.admin_default ? 'Usar IA' : 'No usar IA'}` : 'Definido y bloqueado por Administración' }}
              </p>
            </div>
            <Checkbox
              :id="`ai-field-${field.id}`"
              :model-value="values[field.id]"
              :disabled="!field.coordinator_configurable"
              @update:model-value="updateValue(field.id, $event)"
            />
          </Field>
        </CardContent>
      </Card>
    </form>
  </PageFrame>
</template>
