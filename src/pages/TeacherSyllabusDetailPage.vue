<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabus, saveTeacherField, startTeacherSyllabus, submitTeacherSyllabus, validateTeacherSyllabus, type SyllabusDetail, type SyllabusField } from '@/api/syllabi';

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);
const savingFieldId = ref<string | null>(null);
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const validationMessages = ref<string[]>([]);
const validationRan = ref(false);

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

const saveField = async (field: SyllabusField): Promise<void> => {
  if (!syllabus.value) return;
  savingFieldId.value = field.id;
  try {
    const saved = await saveTeacherField(syllabus.value.id, field.id, syllabus.value.version_bloqueo, field.value);
    syllabus.value.version_bloqueo = saved.version_bloqueo;
    syllabus.value.completion = saved.completion;
    validationRan.value = false;
    validationMessages.value = [];
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el campo.';
  } finally {
    savingFieldId.value = null;
  }
};

const scheduleSave = (field: SyllabusField): void => {
  const previous = saveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  saveTimers.set(field.id, setTimeout(() => void saveField(field), 700));
};

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
              <p v-else-if="field.inherited">{{ field.label }}: {{ field.value ?? 'Dato institucional' }}</p>
            </template>
          </template>
        </section>
      </section>
      <section v-if="syllabus.state === 'borrador' || syllabus.state === 'correccion_solicitada'" class="detail-card">
        <h2>Revisión del borrador</h2>
        <button type="button" @click="validate">Validar sílabo</button>
        <ul v-if="validationMessages.length"><li v-for="message in validationMessages" :key="message">{{ message }}</li></ul>
        <button v-if="validationRan && validationMessages.length === 0 && syllabus.completion === 100" type="button" @click="submit">Enviar a revisión</button>
      </section>
    </template>
    <p v-else>Cargando sílabo…</p>
  </main>
</template>
