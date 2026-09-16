<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ApiError } from "@/api/client";
import {
  getCareerAiConfiguration,
  resetCareerAiConfiguration,
  saveCareerAiConfiguration,
  type CareerAiConfiguration,
} from "@/api/ai-configuration";

const data = ref<CareerAiConfiguration | null>(null);
const values = ref<Record<string, boolean>>({});
const loading = ref(true);
const saving = ref(false);
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const sections = computed(() => [
  ...new Set(data.value?.fields.map((field) => field.section) ?? []),
]);

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
  <main class="app-page">
    <header class="app-header">
      <div>
        <p class="eyebrow">Coordinación</p>
        <h1>Configuración de IA</h1>
        <p>Decida qué campos puede consultar la IA para esta carrera.</p>
      </div>
    </header>
    <p v-if="message" class="feedback success">{{ message }}</p>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="loading && !data" role="status">Cargando configuración de IA…</p>
    <form v-if="data" class="ai-config-form" @submit.prevent="save">
      <p v-if="!data.fields.length" class="empty-state">
        La plantilla no tiene campos configurables para IA.
      </p>
      <section v-for="section in sections" :key="section" class="detail-card">
        <h2>{{ section }}</h2>
        <label
          v-for="field in data.fields.filter(
            (item) => item.section === section,
          )"
          :key="field.id"
          class="ai-config-field"
        >
          <span
            ><strong>{{ field.label }}</strong
            ><small v-if="!field.coordinator_configurable"
              >Definido y bloqueado por Administración</small
            ><small v-else
              >Valor institucional:
              {{ field.admin_default ? "Usar IA" : "No usar IA" }}</small
            ></span
          >
          <input
            v-model="values[field.id]"
            type="checkbox"
            :disabled="!field.coordinator_configurable"
          />
        </label>
      </section>
      <div class="ai-config-actions">
        <button type="button" :disabled="saving" @click="reset">
          Restablecer valores de Administración</button
        ><button class="primary-action" :disabled="saving">
          {{ saving ? "Guardando…" : "Guardar configuración" }}
        </button>
      </div>
    </form>
  </main>
</template>
