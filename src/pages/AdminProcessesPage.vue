<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  createProcess,
  extendProcessDeadline,
  getProcesses,
  transitionProcess,
  updateProcess,
  type ProcessPayload,
  type Processes,
  type SyllabusProcess,
} from '@/api/processes';
import { getSession } from '@/api/session';

const router = useRouter();
const data = ref<Processes | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const selectedProcess = ref<SyllabusProcess | null>(null);
const mode = ref<'create' | 'edit' | 'deadline' | null>(null);
const processing = ref(false);
const form = reactive<ProcessPayload>({ period_id: '', starts_at: '', due_at: '' });
const deadline = reactive({ stage: 'entrega', due_at: '', reason: '' });
const pauseReason = ref('');

const asDate = (value: string) => value.slice(0, 10);
const stateLabel = (state: SyllabusProcess['state']) => ({
  preparacion: 'En preparación', abierto: 'Abierto', pausado: 'Pausado', cerrado: 'Cerrado',
}[state]);

const modalTitle = computed(() => mode.value === 'create' ? 'Preparar proceso institucional'
  : mode.value === 'edit' ? `Editar ${selectedProcess.value?.name ?? 'proceso'}`
    : 'Prorrogar plazo institucional');

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') {
      await router.replace('/panel');
      return;
    }
    data.value = await getProcesses();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los procesos institucionales.';
  } finally {
    loading.value = false;
  }
};

const openCreate = (): void => {
  form.period_id = '';
  form.starts_at = '';
  form.due_at = '';
  selectedProcess.value = null;
  mode.value = 'create';
};

const openEdit = (process: SyllabusProcess): void => {
  selectedProcess.value = process;
  form.period_id = process.period_id;
  form.starts_at = asDate(process.starts_at);
  form.due_at = asDate(process.due_at);
  mode.value = 'edit';
};

const openDeadline = (process: SyllabusProcess): void => {
  selectedProcess.value = process;
  deadline.stage = 'entrega';
  deadline.due_at = asDate(process.due_at);
  deadline.reason = '';
  mode.value = 'deadline';
};

const save = async (): Promise<void> => {
  try {
    processing.value = true;
    error.value = null;
    message.value = mode.value === 'create'
      ? (await createProcess({ ...form })).message
      : (await updateProcess(selectedProcess.value!.id, { ...form })).message;
    mode.value = null;
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el proceso.';
  } finally {
    processing.value = false;
  }
};

const saveDeadline = async (): Promise<void> => {
  if (!selectedProcess.value) return;
  try {
    processing.value = true;
    error.value = null;
    message.value = await extendProcessDeadline(selectedProcess.value.id, { ...deadline }).then((response) => response.message);
    mode.value = null;
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo prorrogar el plazo.';
  } finally {
    processing.value = false;
  }
};

const transition = async (process: SyllabusProcess, action: 'abrir' | 'pausar' | 'reanudar' | 'cerrar'): Promise<void> => {
  const reason = action === 'pausar' ? pauseReason.value.trim() : undefined;
  if (action === 'pausar' && pauseReason.value.trim().length < 10) {
    error.value = 'Indique un motivo de al menos 10 caracteres para pausar el proceso.';
    return;
  }
  try {
    processing.value = true;
    error.value = null;
    message.value = (await transitionProcess(process.id, action, reason)).message;
    pauseReason.value = '';
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado del proceso.';
  } finally {
    processing.value = false;
  }
};

onMounted(() => { void load(); });
</script>

<template>
  <main class="app-page">
    <header class="app-header">
      <div>
        <p class="eyebrow">Administración</p>
        <h1>Proceso institucional</h1>
        <p>Define el período y calendario que regirán las convocatorias de sílabos.</p>
      </div>
      <div class="header-actions">
        <RouterLink class="back-link" to="/panel">Volver al panel</RouterLink>
        <button type="button" @click="openCreate">Preparar proceso</button>
      </div>
    </header>

    <p v-if="data?.template" class="detail-card">Plantilla institucional vigente: <strong>{{ data.template }}</strong></p>
    <p v-if="data?.active_process" class="save-status">Proceso vigente: {{ data.active_process.name }} · {{ stateLabel(data.active_process.state as SyllabusProcess['state']) }}</p>
    <p v-if="message" class="save-status" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="loading && !data" role="status">Cargando procesos…</p>

    <section v-if="data" class="detail-card">
      <h2>Historial de procesos</h2>
      <div v-if="data.processes.length" class="table-wrap">
        <table>
          <thead><tr><th>Período</th><th>Calendario</th><th>Estado</th><th>Convocatorias</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="process in data.processes" :key="process.id">
              <td><strong>{{ process.name }}</strong><small>{{ process.template }}</small></td>
              <td>{{ asDate(process.starts_at) }} — {{ asDate(process.due_at) }}</td>
              <td><span class="role-badge">{{ stateLabel(process.state) }}</span></td>
              <td>{{ process.convocations_count }}</td>
              <td class="process-actions">
                <button v-if="process.configurable" type="button" @click="openEdit(process)">Editar</button>
                <button v-if="process.state === 'preparacion'" type="button" :disabled="processing" @click="transition(process, 'abrir')">Abrir</button>
                <template v-if="process.state === 'abierto'">
                  <button type="button" :disabled="processing" @click="openDeadline(process)">Prorrogar</button>
                  <input v-model="pauseReason" aria-label="Motivo de la pausa" placeholder="Motivo para pausar" />
                  <button type="button" :disabled="processing" @click="transition(process, 'pausar')">Pausar</button>
                  <button type="button" :disabled="processing" @click="transition(process, 'cerrar')">Cerrar</button>
                </template>
                <template v-if="process.state === 'pausado'">
                  <button type="button" :disabled="processing" @click="transition(process, 'reanudar')">Reanudar</button>
                  <button type="button" :disabled="processing" @click="transition(process, 'cerrar')">Cerrar</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-state">Aún no existe un proceso institucional preparado.</p>
    </section>

    <section v-if="mode" class="detail-card" aria-live="polite">
      <header class="setup-heading"><h2>{{ modalTitle }}</h2><button type="button" @click="mode = null">Cancelar</button></header>
      <form v-if="mode !== 'deadline'" class="editor-form" @submit.prevent="save">
        <label>Período académico
          <select v-model="form.period_id" :disabled="mode === 'edit' && !selectedProcess?.configurable" required>
            <option value="">Seleccione un período</option>
            <option v-for="period in data?.periods" :key="period.id" :value="period.id">{{ period.codigo }}</option>
          </select>
        </label>
        <label>Inicio<input v-model="form.starts_at" type="date" required /></label>
        <label>Fecha límite de entrega<input v-model="form.due_at" type="date" required /></label>
        <button :disabled="processing">{{ processing ? 'Guardando…' : 'Guardar proceso' }}</button>
      </form>
      <form v-else class="editor-form" @submit.prevent="saveDeadline">
        <label>Etapa
          <select v-model="deadline.stage"><option value="inicio">Inicio</option><option value="borrador">Borrador</option><option value="entrega">Entrega</option></select>
        </label>
        <label>Nueva fecha límite<input v-model="deadline.due_at" type="date" required /></label>
        <label>Motivo de la prórroga<textarea v-model="deadline.reason" required minlength="10" maxlength="500" /></label>
        <button :disabled="processing">{{ processing ? 'Guardando…' : 'Guardar prórroga' }}</button>
      </form>
    </section>
  </main>
</template>
