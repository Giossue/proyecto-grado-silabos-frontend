<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { applyAiRecommendation, decideAiRecommendation, getFieldAiAnalysis, getTeacherSyllabus, requestAiReview, requestFieldAiAnalysis, respondObservation, saveTeacherField, saveTeacherRows, startTeacherSyllabus, submitTeacherSyllabus, validateTeacherSyllabus, type AiFieldAnalysis, type RepeatableRow, type SyllabusBlock, type SyllabusDetail, type SyllabusField } from '@/api/syllabi';

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);
const savingFieldId = ref<string | null>(null);
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const rowSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
let pendingSave: Promise<void> = Promise.resolve();
const validationMessages = ref<string[]>([]);
const validationRan = ref(false);
const responseDrafts = ref<Record<string, string>>({});
const aiAnalysis = ref<AiFieldAnalysis | null>(null);
const aiField = ref<SyllabusField | null>(null);
const aiLoading = ref(false);
const aiMessage = ref<string | null>(null);

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

const invalidateValidation = (): void => {
  validationRan.value = false;
  validationMessages.value = [];
};

const queueSave = (operation: () => Promise<void>): void => {
  pendingSave = pendingSave.then(operation).catch((reason: unknown) => {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el cambio.';
  });
};

const saveField = (field: SyllabusField): void => {
  queueSave(async () => {
  if (!syllabus.value) return;
  savingFieldId.value = field.id;
  try {
    const saved = await saveTeacherField(syllabus.value.id, field.id, syllabus.value.version_bloqueo, field.value);
    syllabus.value.version_bloqueo = saved.version_bloqueo;
    syllabus.value.completion = saved.completion;
    invalidateValidation();
  } finally {
    savingFieldId.value = null;
  }
  });
};

const scheduleSave = (field: SyllabusField): void => {
  const previous = saveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  saveTimers.set(field.id, setTimeout(() => saveField(field), 700));
};

const selectedValues = (field: SyllabusField): string[] => {
  const value = (field as unknown as { value: unknown }).value;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
};

const toggleChoice = (field: SyllabusField, value: string, checked: boolean): void => {
  const next = checked ? [...selectedValues(field), value] : selectedValues(field).filter((item) => item !== value);
  (field as unknown as { value: string[] }).value = next;
  scheduleSave(field);
};

const toggleBoolean = (field: SyllabusField, checked: boolean): void => {
  (field as unknown as { value: boolean }).value = checked;
  scheduleSave(field);
};

const isChecked = (field: SyllabusField): boolean => (field as unknown as { value: unknown }).value === true;

const addRow = (field: SyllabusField, block: SyllabusBlock): void => {
  const position = field.rows.length + 1;
  field.rows.push({
    position,
    data: Object.fromEntries((block.table?.columns ?? []).map((column) => [column.key, null])),
  });
  scheduleRows(field);
};

const removeRow = (field: SyllabusField, position: number): void => {
  field.rows.splice(position, 1);
  field.rows.forEach((row, index) => { row.position = index + 1; });
  scheduleRows(field);
};

const saveRows = (field: SyllabusField): void => {
  queueSave(async () => {
    if (!syllabus.value) return;
    savingFieldId.value = field.id;
    try {
      const saved = await saveTeacherRows(
        syllabus.value.id,
        field.id,
        syllabus.value.version_bloqueo,
        field.rows.map((row) => ({ ...row, id: row.id || undefined })),
      );
      field.rows = saved.rows;
      syllabus.value.version_bloqueo = saved.version_bloqueo;
      syllabus.value.completion = saved.completion;
      invalidateValidation();
    } finally {
      savingFieldId.value = null;
    }
  });
};

const scheduleRows = (field: SyllabusField): void => {
  const previous = rowSaveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  rowSaveTimers.set(field.id, setTimeout(() => saveRows(field), 700));
};

const total = (rows: RepeatableRow[], key: string): number => rows.reduce((sum, row) => {
  const value = row.data[key];
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? sum + numeric : sum;
}, 0);

const validate = async (): Promise<void> => {
  if (!syllabus.value) return;
  const result = await validateTeacherSyllabus(syllabus.value.id);
  validationRan.value = true;
  validationMessages.value = result.validation.results.map((issue) => issue.message);
};

const submit = async (): Promise<void> => {
  if (!syllabus.value) return;
  syllabus.value = (await submitTeacherSyllabus(syllabus.value.id, syllabus.value.version_bloqueo)).syllabus;
};
const askAi = async (): Promise<void> => { if (syllabus.value) await requestAiReview(syllabus.value.id, syllabus.value.version_bloqueo); };
const answer = async (observationId: string): Promise<void> => {
  if (!syllabus.value) return;
  await respondObservation(syllabus.value.id, observationId, responseDrafts.value[observationId] ?? '');
  await load();
};

const refreshAiAnalysis = async (): Promise<void> => {
  if (!syllabus.value || !aiField.value) return;
  aiLoading.value = true;
  try {
    aiAnalysis.value = await getFieldAiAnalysis(syllabus.value.id, aiField.value.id);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo consultar la ayuda de IA.';
  } finally {
    aiLoading.value = false;
  }
};

const openAi = async (field: SyllabusField): Promise<void> => {
  aiField.value = field;
  aiAnalysis.value = null;
  aiMessage.value = null;
  await refreshAiAnalysis();
};

const requestAiForField = async (): Promise<void> => {
  if (!syllabus.value || !aiField.value) return;
  aiLoading.value = true;
  try {
    const result = await requestFieldAiAnalysis(syllabus.value.id, aiField.value.id);
    aiMessage.value = result.message;
    await refreshAiAnalysis();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo solicitar el análisis de IA.';
  } finally {
    aiLoading.value = false;
  }
};

const decideAi = async (recommendationId: string, decision: 'aceptada' | 'ignorada' | 'no_util'): Promise<void> => {
  if (!syllabus.value || !aiField.value) return;
  await decideAiRecommendation(syllabus.value.id, aiField.value.id, recommendationId, decision);
  await refreshAiAnalysis();
};

const applyAi = async (recommendationId: string): Promise<void> => {
  if (!syllabus.value || !aiField.value) return;
  const result = await applyAiRecommendation(syllabus.value.id, aiField.value.id, recommendationId, syllabus.value.version_bloqueo);
  aiField.value.value = result.value;
  syllabus.value.version_bloqueo = result.version_bloqueo;
  syllabus.value.completion = result.completion;
  invalidateValidation();
  aiMessage.value = result.message;
  await refreshAiAnalysis();
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
      <section v-if="syllabus.state !== 'sin_iniciar'" class="editor-form">
        <section v-for="section in syllabus.sections" :key="section.id" class="detail-card">
          <h2>{{ section.title }}</h2>
          <p v-if="section.description">{{ section.description }}</p>
          <template v-for="block in section.blocks" :key="block.id">
            <h3 v-if="block.title">{{ block.title }}</h3>
            <template v-for="field in block.fields" :key="field.id">
              <label v-if="field.teacher_editable && !field.inherited && ['texto_corto', 'numero', 'fecha'].includes(field.type)">
                {{ field.label }}<span v-if="field.required"> *</span>
                <input v-model="field.value" :type="field.type === 'fecha' ? 'date' : field.type === 'numero' ? 'number' : 'text'" :disabled="savingFieldId === field.id" @input="scheduleSave(field)" />
              </label>
              <label v-else-if="field.teacher_editable && !field.inherited && ['texto_largo', 'markdown'].includes(field.type)">
                {{ field.label }}<span v-if="field.required"> *</span>
                <textarea v-model="field.value" :disabled="savingFieldId === field.id" @input="scheduleSave(field)" />
              </label>
              <label v-else-if="field.teacher_editable && !field.inherited && field.type === 'seleccion_unica'">
                {{ field.label }}<span v-if="field.required"> *</span>
                <select v-model="field.value" :disabled="savingFieldId === field.id" @change="scheduleSave(field)"><option value="">Seleccione una opción</option><option v-for="option in field.options" :key="option.value" :value="option.value">{{ option.label }}</option></select>
              </label>
              <fieldset v-else-if="field.teacher_editable && !field.inherited && field.type === 'seleccion_multiple'">
                <legend>{{ field.label }}<span v-if="field.required"> *</span></legend>
                <label v-for="option in field.options" :key="option.value"><input type="checkbox" :checked="selectedValues(field).includes(option.value)" @change="toggleChoice(field, option.value, ($event.target as HTMLInputElement).checked)" /> {{ option.label }}</label>
              </fieldset>
              <label v-else-if="field.teacher_editable && !field.inherited && field.type === 'booleano'">
                <input type="checkbox" :checked="isChecked(field)" @change="toggleBoolean(field, ($event.target as HTMLInputElement).checked)" /> {{ field.label }}<span v-if="field.required"> *</span>
              </label>
              <div v-else-if="field.teacher_editable && !field.inherited && field.type === 'repetible'" class="table-wrap">
                <p v-if="!block.table">Esta tabla no tiene una estructura configurada.</p>
                <template v-else>
                  <p v-if="block.table.repeat.enabled" class="table-caption">{{ block.table.repeat.label }}</p>
                  <table>
                    <thead>
                      <tr v-if="block.table.bands.length">
                        <th v-for="band in block.table.bands" :key="band.key" :colspan="block.table.columns.filter((column) => column.band === band.key).length">
                          {{ band.label }}
                        </th>
                        <th v-if="block.table.columns.some((column) => !column.band)" :colspan="block.table.columns.filter((column) => !column.band).length"></th>
                        <th :rowspan="block.table.groups.length ? 3 : 2" scope="col">Acciones</th>
                      </tr>
                      <tr v-if="block.table.groups.length">
                        <th v-for="group in block.table.groups" :key="group.key" :colspan="block.table.columns.filter((column) => column.group === group.key).length">
                          {{ group.label }}
                        </th>
                        <th v-if="block.table.columns.some((column) => !column.group)" :colspan="block.table.columns.filter((column) => !column.group).length"></th>
                        <th v-if="!block.table.bands.length" scope="col">Acciones</th>
                      </tr>
                      <tr>
                        <th v-for="column in block.table.columns" :key="column.key" scope="col">{{ column.label }}</th>
                        <th v-if="!block.table.bands.length && !block.table.groups.length" scope="col">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in field.rows" :key="row.id || row.position">
                        <td v-for="column in block.table.columns" :key="column.key">
                          <input
                            v-model="row.data[column.key]"
                            :type="column.type === 'number' ? 'number' : 'text'"
                            :disabled="savingFieldId === field.id"
                            @input="scheduleRows(field)"
                          />
                        </td>
                        <td><button type="button" :disabled="savingFieldId === field.id" @click="removeRow(field, rowIndex)">Quitar</button></td>
                      </tr>
                      <tr v-if="!field.rows.length"><td :colspan="block.table.columns.length + 1">Aún no hay filas.</td></tr>
                    </tbody>
                    <tfoot v-if="block.table.totals.enabled">
                      <tr>
                        <th scope="row">{{ block.table.totals.label }}</th>
                        <td v-for="column in block.table.columns.slice(1)" :key="column.key">
                          <template v-if="column.type === 'number' && column.sum">{{ total(field.rows, column.key) }}</template>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  <button type="button" :disabled="savingFieldId === field.id" @click="addRow(field, block)">Agregar fila</button>
                  <span v-if="savingFieldId === field.id" class="save-status">Guardando…</span>
                </template>
              </div>
              <p v-else-if="field.inherited">{{ field.label }}: {{ field.value ?? 'Dato institucional' }}</p>
              <button
                v-if="field.teacher_editable && !field.inherited && field.ai_enabled"
                class="ai-field-button"
                type="button"
                @click="openAi(field)"
              >
                Consultar IA sobre {{ field.label }}
              </button>
            </template>
          </template>
        </section>
      </section>
      <section v-if="syllabus.state === 'borrador' || syllabus.state === 'correccion_solicitada'" class="detail-card">
        <h2>Revisión del borrador</h2>
        <button type="button" @click="validate">Validar sílabo</button>
        <ul v-if="validationMessages.length"><li v-for="message in validationMessages" :key="message">{{ message }}</li></ul>
        <button v-if="validationRan && validationMessages.length === 0 && syllabus.completion === 100" type="button" @click="submit">Enviar a revisión</button>
        <button type="button" @click="askAi">Solicitar consejos de IA</button>
      </section>
      <aside v-if="aiField" class="ai-panel" aria-label="Asistencia de IA">
        <header>
          <div>
            <p class="eyebrow">Asistencia de IA</p>
            <h2>{{ aiField.label }}</h2>
          </div>
          <button type="button" aria-label="Cerrar asistencia de IA" @click="aiField = null">×</button>
        </header>
        <p v-if="aiMessage" class="save-status">{{ aiMessage }}</p>
        <p v-if="aiLoading">Consultando…</p>
        <template v-else-if="aiAnalysis">
          <p v-if="aiAnalysis.environment.is_provisional_simulator">Los resultados provienen del simulador configurado para este entorno.</p>
          <button type="button" @click="requestAiForField">Analizar este campo</button>
          <p v-if="!aiAnalysis.executions.length">Aún no hay análisis para este campo.</p>
          <article v-for="execution in aiAnalysis.executions" :key="execution.id" class="ai-execution">
            <p><strong>Estado:</strong> {{ execution.status }}</p>
            <p v-if="execution.reason">{{ execution.reason }}</p>
            <p v-if="execution.mensaje_error">{{ execution.mensaje_error }}</p>
            <section v-if="execution.recommendations.length">
              <article v-for="recommendation in execution.recommendations" :key="recommendation.id" class="ai-recommendation">
                <h3>{{ recommendation.title }}</h3>
                <p>{{ recommendation.explanation }}</p>
                <textarea :value="recommendation.suggested_text" readonly aria-label="Texto sugerido" />
                <p v-if="recommendation.my_decisions.length">Decisión: {{ recommendation.my_decisions.join(', ') }}</p>
                <div class="ai-actions">
                  <button type="button" @click="decideAi(recommendation.id, 'aceptada')">Útil</button>
                  <button type="button" @click="decideAi(recommendation.id, 'ignorada')">Ignorar</button>
                  <button type="button" :disabled="recommendation.applied" @click="applyAi(recommendation.id)">Aplicar texto</button>
                </div>
              </article>
            </section>
            <section v-if="execution.evidence.length" class="ai-evidence">
              <h3>Fuentes consultadas</h3>
              <article v-for="evidence in execution.evidence" :key="evidence.id">
                <strong>{{ evidence.source }}</strong>
                <p>{{ evidence.excerpt }}</p>
              </article>
            </section>
          </article>
        </template>
      </aside>
      <section v-if="syllabus.observations.length" class="detail-card"><h2>Observaciones</h2><article v-for="observation in syllabus.observations" :key="observation.id"><p>{{ observation.content }}</p><p v-if="observation.response">{{ observation.response.content }}</p><template v-else><textarea v-model="responseDrafts[observation.id]" placeholder="Ej. Corrección realizada" /><button type="button" @click="answer(observation.id)">Responder</button></template></article></section>
    </template>
    <p v-else>Cargando sílabo…</p>
  </main>
</template>
