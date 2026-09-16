<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { ApiError } from "@/api/client";
import { compareReviews, type ReviewComparison } from "@/api/reviews";
import SnapshotValue from "@/components/SnapshotValue.vue";
const route = useRoute();
const data = ref<ReviewComparison | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
onMounted(async () => {
  try {
    data.value = await compareReviews(
      String(route.params.before),
      String(route.params.after),
    );
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo comparar las revisiones.";
  } finally {
    loading.value = false;
  }
});
</script>
<template>
  <main class="app-page">
    <header class="app-header">
      <div>
        <p class="eyebrow">Coordinación · Revisiones</p>
        <h1>{{ data?.syllabus.subject ?? "Comparar revisiones" }}</h1>
        <p v-if="data">
          Revisión {{ data.comparison.before_revision }} frente a
          {{ data.comparison.after_revision }}
        </p>
      </div>
      <RouterLink
        class="back-link"
        :to="`/coordinacion/revisiones/${String(route.params.after)}`"
        >Volver a la revisión</RouterLink
      >
    </header>
    <p v-if="error" class="feedback error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Comparando revisiones…</p>
    <template v-if="data"
      ><p class="comparison-summary">
        {{ data.comparison.changed_fields }} campo(s) cambiaron.
      </p>
      <section
        v-for="change in data.comparison.changes"
        :key="`${change.section_key}.${change.field_key}`"
        class="comparison-change"
      >
        <header>
          <div>
            <p>{{ change.section_title }}</p>
            <h2>{{ change.label }}</h2>
          </div>
          <span class="role-badge">{{
            change.change === "added"
              ? "Agregado"
              : change.change === "removed"
                ? "Eliminado"
                : "Modificado"
          }}</span>
        </header>
        <div class="comparison-columns">
          <article>
            <h3>Antes</h3>
            <SnapshotValue
              v-if="change.before"
              :value="change.before.value"
              :rows="change.before.rows"
            />
            <p v-else>El campo no existía.</p>
          </article>
          <article>
            <h3>Después</h3>
            <SnapshotValue
              v-if="change.after"
              :value="change.after.value"
              :rows="change.after.rows"
            />
            <p v-else>El campo fue eliminado.</p>
          </article>
        </div>
      </section>
      <p v-if="!data.comparison.changes.length" class="empty-state">
        No existen diferencias de contenido.
      </p></template
    >
  </main>
</template>
