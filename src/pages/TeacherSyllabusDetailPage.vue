<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabus, startTeacherSyllabus, type SyllabusDetail } from '@/api/syllabi';

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);

const syllabusId = (): string => String(route.params.syllabus);

const load = async (): Promise<void> => {
  try {
    syllabus.value = (await getTeacherSyllabus(syllabusId())).syllabus;
  } catch (reason) {
    if (reason instanceof ApiError && [401, 403, 404, 409].includes(reason.status)) {
      await router.replace('/mis-silabos');
      return;
    }
    error.value = 'No se pudo cargar el sílabo.';
  }
};

const start = async (): Promise<void> => {
  starting.value = true;
  error.value = null;
  try {
    syllabus.value = (await startTeacherSyllabus(syllabusId())).syllabus;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo iniciar el borrador.';
  } finally {
    starting.value = false;
  }
};

onMounted(load);
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div v-if="syllabus">
        <p class="eyebrow">{{ syllabus.code }} · {{ syllabus.period }}</p>
        <h1>{{ syllabus.subject }}</h1>
        <p>{{ syllabus.convocation }} · Paralelo(s) {{ syllabus.parallels.join(', ') }}</p>
      </div>
      <RouterLink class="back-link" to="/mis-silabos">Volver a mis sílabos</RouterLink>
    </header>

    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="syllabus">
      <section class="detail-card">
        <h2>{{ syllabus.state === 'sin_iniciar' ? 'Listo para iniciar' : 'Borrador de sílabo' }}</h2>
        <p>Avance: {{ syllabus.completion.toFixed(0) }} %</p>
        <button v-if="syllabus.state === 'sin_iniciar'" :disabled="starting" type="button" @click="start">
          {{ starting ? 'Iniciando…' : 'Iniciar borrador' }}
        </button>
        <p v-else>El editor con autoguardado se está trasladando en la siguiente unidad.</p>
      </section>
      <section class="detail-card">
        <h2>Estructura del sílabo</h2>
        <p>{{ syllabus.sections.length }} secciones configuradas en la plantilla.</p>
      </section>
    </template>
    <p v-else>Cargando sílabo…</p>
  </main>
</template>
