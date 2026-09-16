<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';

const router = useRouter();
const result = ref<SyllabiResponse | null>(null);
const query = ref('');
const state = ref('all');
const error = ref<string | null>(null);

const states: Record<string, string> = {
  sin_iniciar: 'Sin iniciar',
  borrador: 'Borrador',
  en_revision: 'En revisión',
  correccion_solicitada: 'Corrección solicitada',
  aprobado: 'Aprobado',
};

const load = async (page = 1): Promise<void> => {
  error.value = null;
  try {
    result.value = await getTeacherSyllabi({ q: query.value, state: state.value, page });
  } catch (reason) {
    if (reason instanceof ApiError && [401, 403, 409].includes(reason.status)) {
      await router.replace('/');
      return;
    }
    error.value = 'No se pudieron cargar sus sílabos.';
  }
};

const formatSavedAt = (value: string | null): string =>
  value
    ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Sin guardados';

onMounted(load);
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div>
        <p class="eyebrow">Sílabos UEB</p>
        <h1>Mis sílabos</h1>
        <p>Los sílabos de las materias que usted dicta.</p>
      </div>
      <RouterLink class="back-link" to="/panel">Volver al panel</RouterLink>
    </header>

    <form class="filter-form" @submit.prevent="load()">
      <label>
        Buscar
        <input v-model="query" type="search" placeholder="Ej. Desarrollo de software" />
      </label>
      <label>
        Estado
        <select v-model="state">
          <option value="all">Todos los estados</option>
          <option v-for="(label, value) in states" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <button type="submit">Aplicar filtros</button>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="result">
      <div v-if="result.syllabi.data.length === 0" class="empty-state">
        No tiene sílabos asignados con estos filtros.
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>Asignatura</th><th>Convocatoria</th><th>Estado</th><th>Último guardado</th><th>Avance</th></tr>
          </thead>
          <tbody>
            <tr v-for="syllabus in result.syllabi.data" :key="syllabus.id">
              <td><RouterLink class="subject-link" :to="`/mis-silabos/${syllabus.id}`">{{ syllabus.subject }}</RouterLink><small>{{ syllabus.code }} · Paralelo(s) {{ syllabus.parallels.join(', ') }}</small></td>
              <td>{{ syllabus.convocation }}<small>{{ syllabus.period }}</small></td>
              <td>{{ states[syllabus.state] }}</td>
              <td>{{ formatSavedAt(syllabus.guardado_en) }}</td>
              <td>{{ syllabus.completion.toFixed(0) }} %</td>
            </tr>
          </tbody>
        </table>
      </div>
      <nav v-if="result.syllabi.last_page > 1" class="pagination" aria-label="Paginación de sílabos">
        <button :disabled="result.syllabi.current_page === 1" @click="load(result.syllabi.current_page - 1)">Anterior</button>
        <span>Página {{ result.syllabi.current_page }} de {{ result.syllabi.last_page }}</span>
        <button :disabled="result.syllabi.current_page === result.syllabi.last_page" @click="load(result.syllabi.current_page + 1)">Siguiente</button>
      </nav>
    </template>
    <p v-else>Cargando sílabos…</p>
  </main>
</template>
