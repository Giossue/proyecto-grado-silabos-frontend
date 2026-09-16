<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { createConvocation, getConvocations, type ConvocationItem, type ConvocationsPage } from '@/api/convocations';
import { getSession } from '@/api/session';

const router = useRouter();
const data = ref<ConvocationsPage | null>(null);
const search = ref('');
const state = ref('');
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const openingProcess = ref<string | null>(null);

const stateLabel = (value: ConvocationItem['state']) => ({
  sin_iniciar: 'Sin iniciar', preparacion: 'En preparación', abierta: 'Abierta', pausada: 'Pausada', cerrada: 'Cerrada',
}[value]);

const load = async (): Promise<void> => {
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace('/panel');
      return;
    }
    data.value = await getConvocations({ q: search.value, state: state.value });
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las convocatorias.';
  }
};

const start = async (item: ConvocationItem): Promise<void> => {
  try {
    openingProcess.value = item.process_id;
    error.value = null;
    const response = await createConvocation(item.process_id);
    message.value = response.message;
    await router.push(`/coordinacion/convocatorias/${response.convocation_id}`);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo iniciar la convocatoria.';
  } finally {
    openingProcess.value = null;
  }
};

onMounted(() => { void load(); });
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div><p class="eyebrow">Coordinación</p><h1>Convocatorias</h1><p>Abra una convocatoria para entregar los sílabos de su carrera.</p></div>
      <RouterLink class="back-link" to="/panel">Volver al panel</RouterLink>
    </header>

    <form class="filter-form" @submit.prevent="load">
      <label>Buscar período<input v-model="search" placeholder="Ej. 2026-2" /></label>
      <label>Estado<select v-model="state"><option value="">Todos</option><option value="sin_iniciar">Sin iniciar</option><option value="abierta">Abierta</option><option value="pausada">Pausada</option><option value="cerrada">Cerrada</option></select></label>
      <button>Buscar</button>
    </form>
    <p v-if="message" class="save-status" role="status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p>

    <section v-if="data" class="detail-card">
      <h2>Procesos disponibles</h2>
      <div v-if="data.convocations.data.length" class="table-wrap">
        <table><thead><tr><th>Período</th><th>Proceso institucional</th><th>Estado</th><th>Sílabos</th><th></th></tr></thead><tbody>
          <tr v-for="item in data.convocations.data" :key="item.process_id">
            <td><strong>{{ item.period }}</strong><small>{{ item.template }}</small></td>
            <td>{{ item.process_state }}</td><td><span class="role-badge">{{ stateLabel(item.state) }}</span></td><td>{{ item.syllabi_count }}</td>
            <td><button v-if="item.state === 'sin_iniciar' && item.process_state === 'abierto'" :disabled="openingProcess === item.process_id" @click="start(item)">{{ openingProcess === item.process_id ? 'Abriendo…' : 'Abrir convocatoria' }}</button><RouterLink v-else-if="item.id" class="back-link" :to="`/coordinacion/convocatorias/${item.id}`">Ver detalle</RouterLink><span v-else>Proceso no disponible</span></td>
          </tr>
        </tbody></table>
      </div>
      <p v-else class="empty-state">No hay procesos institucionales que coincidan con la búsqueda.</p>
    </section>
  </main>
</template>
