<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  getTeacherSyllabus,
  requestAiReview,
  respondObservation,
  saveTeacherField,
  saveTeacherRows,
  startTeacherSyllabus,
  submitTeacherSyllabus,
  validateTeacherSyllabus,
  type RepeatableRow,
  type SyllabusDetail,
  type SyllabusField,
} from "@/api/syllabi";
import SyllabusAiChat from "@/components/SyllabusAiChat.vue";
import SyllabusDocumentHeader from "@/components/SyllabusDocumentHeader.vue";
import SyllabusIdentificationTable from "@/components/SyllabusIdentificationTable.vue";
import SnapshotValue from "@/components/SnapshotValue.vue";
import SyllabusTableEditor from "@/components/SyllabusTableEditor.vue";
import SyllabusTableView from "@/components/SyllabusTableView.vue";

const route = useRoute();
const router = useRouter();
const syllabus = ref<SyllabusDetail | null>(null);
const error = ref<string | null>(null);
const starting = ref(false);
const savingFieldId = ref<string | null>(null);
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const rowSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const dirtyFields = new Map<string, SyllabusField>();
const dirtyRows = new Map<string, SyllabusField>();
let pendingSave: Promise<void> = Promise.resolve();
const validationResults = ref<Array<{
  field_id: string | null;
  code: string;
  severity: string;
  message: string;
}>>([]);
const validationRan = ref(false);
const validationBlockingErrors = ref<number | null>(null);
const responseDrafts = ref<Record<string, string>>({});
const answeringObservationId = ref<string | null>(null);
const aiMessage = ref<string | null>(null);
const aiChat = ref<InstanceType<typeof SyllabusAiChat> | null>(null);
const conflict = ref(false);
const processingAction = ref(false);

const canEdit = computed(() =>
  ["borrador", "correccion_solicitada"].includes(syllabus.value?.state ?? ""),
);

const syllabusId = (): string => String(route.params.syllabus);

const load = async (): Promise<void> => {
  try {
    syllabus.value = (await getTeacherSyllabus(syllabusId())).syllabus;
    conflict.value = false;
    error.value = null;
  } catch (reason) {
    if (
      reason instanceof ApiError &&
      [401, 403, 404, 409].includes(reason.status)
    ) {
      await router.replace("/mis-silabos");
      return;
    }
    error.value = "No se pudo cargar el sílabo.";
  }
};

const start = async (): Promise<void> => {
  starting.value = true;
  error.value = null;
  try {
    syllabus.value = (await startTeacherSyllabus(syllabusId())).syllabus;
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo iniciar el borrador.";
  } finally {
    starting.value = false;
  }
};

const invalidateValidation = (): void => {
  validationRan.value = false;
  validationBlockingErrors.value = null;
  validationResults.value = [];
};

const queueSave = (operation: () => Promise<void>): void => {
  pendingSave = pendingSave.then(async () => {
    if (!conflict.value) await operation();
  }).catch((reason: unknown) => {
    if (reason instanceof ApiError && reason.status === 409) {
      conflict.value = true;
      error.value =
        "El borrador cambió en otra sesión. Recárguelo antes de continuar para evitar sobrescribir cambios.";
      return;
    }
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo guardar el cambio.";
  });
};

const saveField = (field: SyllabusField): void => {
  dirtyFields.delete(field.id);
  const timer = saveTimers.get(field.id);
  if (timer) clearTimeout(timer);
  saveTimers.delete(field.id);
  queueSave(async () => {
    if (!syllabus.value) return;
    savingFieldId.value = field.id;
    try {
      const saved = await saveTeacherField(
        syllabus.value.id,
        field.id,
        syllabus.value.version_bloqueo,
        field.value,
      );
      syllabus.value.version_bloqueo = saved.version_bloqueo;
      syllabus.value.completion = saved.completion;
      invalidateValidation();
    } finally {
      savingFieldId.value = null;
    }
  });
};

const scheduleSave = (field: SyllabusField): void => {
  if (!canEdit.value || conflict.value) return;
  const previous = saveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  dirtyFields.set(field.id, field);
  saveTimers.set(
    field.id,
    setTimeout(() => saveField(field), 700),
  );
};

const selectedValues = (field: SyllabusField): string[] => {
  const value = (field as unknown as { value: unknown }).value;
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const toggleChoice = (
  field: SyllabusField,
  value: string,
  checked: boolean,
): void => {
  const next = checked
    ? Array.from(new Set([...selectedValues(field), value]))
    : selectedValues(field).filter((item) => item !== value);
  (field as unknown as { value: string[] }).value = next;
  scheduleSave(field);
};

const toggleBoolean = (field: SyllabusField, checked: boolean): void => {
  (field as unknown as { value: boolean }).value = checked;
  scheduleSave(field);
};

const scalarValue = (field: SyllabusField): string | number =>
  typeof field.value === "string" || typeof field.value === "number"
    ? field.value
    : "";

const updateScalar = (field: SyllabusField, value: string): void => {
  field.value = field.type === "numero" && value !== "" ? Number(value) : value;
  scheduleSave(field);
};

const updateRows = (field: SyllabusField, rows: RepeatableRow[]): void => {
  field.rows = rows;
  scheduleRows(field);
};

const saveRows = (field: SyllabusField): void => {
  dirtyRows.delete(field.id);
  const timer = rowSaveTimers.get(field.id);
  if (timer) clearTimeout(timer);
  rowSaveTimers.delete(field.id);
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
  if (!canEdit.value || conflict.value) return;
  const previous = rowSaveTimers.get(field.id);
  if (previous) clearTimeout(previous);
  dirtyRows.set(field.id, field);
  rowSaveTimers.set(
    field.id,
    setTimeout(() => saveRows(field), 700),
  );
};

const flushAutosave = async (): Promise<boolean> => {
  for (const field of Array.from(dirtyFields.values())) saveField(field);
  for (const field of Array.from(dirtyRows.values())) saveRows(field);
  await pendingSave;

  return !conflict.value;
};

const validate = async (): Promise<void> => {
  if (!syllabus.value) return;
  try {
    processingAction.value = true;
    error.value = null;
    if (!(await flushAutosave())) return;
    const result = await validateTeacherSyllabus(syllabus.value.id);
    validationRan.value = true;
    validationBlockingErrors.value = result.validation.blocking_errors;
    validationResults.value = result.validation.results;
    if (
      result.validation.blocking_errors === 0 &&
      syllabus.value.completion === 100
    ) {
      try {
        const review = await requestAiReview(
          syllabus.value.id,
          syllabus.value.version_bloqueo,
        );
        aiMessage.value = review.message;
        await aiChat.value?.reload();
      } catch (reason) {
        aiMessage.value =
          reason instanceof ApiError
            ? reason.message
            : "La ayuda de IA no está disponible; puede enviar el sílabo igualmente.";
      }
    }
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo validar el sílabo.";
  } finally {
    processingAction.value = false;
  }
};

const submit = async (): Promise<void> => {
  if (!syllabus.value) return;
  try {
    processingAction.value = true;
    error.value = null;
    if (!(await flushAutosave())) return;
    syllabus.value = (
      await submitTeacherSyllabus(
        syllabus.value.id,
        syllabus.value.version_bloqueo,
      )
    ).syllabus;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo enviar el sílabo.";
  } finally {
    processingAction.value = false;
  }
};
const answer = async (observationId: string): Promise<void> => {
  if (!syllabus.value) return;
  const content = (responseDrafts.value[observationId] ?? "").trim();
  if (!content) {
    error.value = "Escriba la corrección realizada antes de responder.";
    return;
  }
  answeringObservationId.value = observationId;
  error.value = null;
  try {
    await respondObservation(syllabus.value.id, observationId, content);
    delete responseDrafts.value[observationId];
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError
      ? reason.message
      : "No se pudo responder la observación.";
  } finally {
    answeringObservationId.value = null;
  }
};

const navigateToField = (fieldId: string): void => {
  document
    .getElementById(`field-${fieldId}`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
};

const recommendationApplied = (payload: {
  fieldId: string;
  value: string;
  version: number;
  completion: number;
}): void => {
  if (!syllabus.value) return;
  const field = syllabus.value.sections
    .flatMap((section) => section.blocks)
    .flatMap((block) => block.fields)
    .find((item) => item.id === payload.fieldId);
  if (field) field.value = payload.value;
  syllabus.value.version_bloqueo = payload.version;
  syllabus.value.completion = payload.completion;
  invalidateValidation();
};

onMounted(load);
onBeforeUnmount(() => {
  saveTimers.forEach((timer) => clearTimeout(timer));
  rowSaveTimers.forEach((timer) => clearTimeout(timer));
});
</script>

<template>
  <main class="app-page teacher-syllabus-page">
    <header class="app-header">
      <div v-if="syllabus">
        <p class="eyebrow">{{ syllabus.code }} · {{ syllabus.period }}</p>
        <h1>{{ syllabus.subject }}</h1>
        <p>
          {{ syllabus.convocation }} · Paralelo(s)
          {{ syllabus.parallels.join(", ") }}
        </p>
      </div>
      <RouterLink class="back-link" to="/mis-silabos"
        >Volver a mis sílabos</RouterLink
      >
    </header>

    <div v-if="error" class="feedback error" role="alert">
      <p>{{ error }}</p>
      <button v-if="conflict" type="button" @click="load">Recargar borrador</button>
    </div>
    <template v-else-if="syllabus">
      <section class="syllabus-editor-status">
        <h2>
          {{
            syllabus.state === "sin_iniciar"
              ? "Listo para iniciar"
              : "Borrador de sílabo"
          }}
        </h2>
        <p>Avance: {{ syllabus.completion.toFixed(0) }} %</p>
        <button
          v-if="syllabus.state === 'sin_iniciar'"
          :disabled="starting"
          type="button"
          @click="start"
        >
          {{ starting ? "Iniciando…" : "Iniciar borrador" }}
        </button>
        <p v-else-if="canEdit">Los cambios se guardan automáticamente.</p>
        <p v-else>Esta versión es de solo lectura.</p>
      </section>
      <section v-if="syllabus.state !== 'sin_iniciar'" class="syllabus-document-workspace">
        <article
          class="syllabus-document-paper"
          :style="{
            fontFamily: syllabus.presentation.appearance.font_family,
            fontSize: `${syllabus.presentation.appearance.body_font_size}pt`,
            color: syllabus.presentation.appearance.text_color,
            textAlign: syllabus.presentation.appearance.body_alignment as 'left' | 'center' | 'right' | 'justify',
            width: syllabus.presentation.appearance.orientation === 'landscape' ? '70rem' : '52rem',
            padding: `${syllabus.presentation.appearance.margin_cm}cm`,
          }"
        >
          <SyllabusDocumentHeader :presentation="syllabus.presentation" />
        <section
          v-for="(section, sectionIndex) in syllabus.sections"
          :key="section.id"
          class="syllabus-document-section"
        >
          <h2
            :style="{
              color: syllabus.presentation.appearance.accent_color,
              fontSize: `${syllabus.presentation.appearance.section_font_size}pt`,
              fontWeight: syllabus.presentation.appearance.section_bold ? '700' : '400',
              fontStyle: syllabus.presentation.appearance.section_italic ? 'italic' : 'normal',
              textAlign: syllabus.presentation.appearance.section_alignment as 'left' | 'center' | 'right',
            }"
          >{{ sectionIndex + 1 }}. {{ section.title }}</h2>
          <p v-if="section.description">{{ section.description }}</p>
          <SyllabusIdentificationTable
            v-if="sectionIndex === 0"
            :rows="syllabus.identification"
          />
          <template v-for="block in section.blocks" :key="block.id">
            <h3 v-if="block.title && block.title !== section.title">{{ block.title }}</h3>
            <template v-for="field in block.fields" :key="field.id">
              <label
                v-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  ['texto_corto', 'numero', 'fecha'].includes(field.type)
                "
                :id="`field-${field.id}`"
              >
                {{ field.label }}<span v-if="field.required"> *</span>
                <small v-if="field.help">{{ field.help }}</small>
                <input
                  :value="scalarValue(field)"
                  :type="
                    field.type === 'fecha'
                      ? 'date'
                      : field.type === 'numero'
                        ? 'number'
                        : 'text'
                  "
                  :disabled="savingFieldId === field.id"
                  @input="updateScalar(field, ($event.target as HTMLInputElement).value)"
                />
              </label>
              <label
                v-else-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  ['texto_largo', 'markdown'].includes(field.type)
                "
                :id="`field-${field.id}`"
              >
                {{ field.label }}<span v-if="field.required"> *</span>
                <small v-if="field.help">{{ field.help }}</small>
                <textarea
                  :value="scalarValue(field)"
                  :disabled="savingFieldId === field.id"
                  @input="updateScalar(field, ($event.target as HTMLTextAreaElement).value)"
                />
              </label>
              <label
                v-else-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  field.type === 'seleccion_unica'
                "
                :id="`field-${field.id}`"
              >
                {{ field.label }}<span v-if="field.required"> *</span>
                <select
                  :value="scalarValue(field)"
                  :disabled="savingFieldId === field.id"
                  @change="updateScalar(field, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">Seleccione una opción</option>
                  <option
                    v-for="option in field.options"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <fieldset
                v-else-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  field.type === 'seleccion_multiple'
                "
                :id="`field-${field.id}`"
              >
                <legend>
                  {{ field.label }}<span v-if="field.required"> *</span>
                </legend>
                <label v-for="option in field.options" :key="option.value"
                  ><input
                    type="checkbox"
                    :checked="selectedValues(field).includes(option.value)"
                    @change="
                      toggleChoice(
                        field,
                        option.value,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  {{ option.label }}</label
                >
              </fieldset>
              <fieldset
                v-else-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  field.type === 'booleano'
                "
                :id="`field-${field.id}`"
              >
                <legend>{{ field.label }}<span v-if="field.required"> *</span></legend>
                <span class="boolean-options">
                  <label><input type="radio" :name="`boolean-${field.id}`" :checked="field.value === true" @change="toggleBoolean(field, true)" /> Sí</label>
                  <label><input type="radio" :name="`boolean-${field.id}`" :checked="field.value === false" @change="toggleBoolean(field, false)" /> No</label>
                </span>
              </fieldset>
              <div
                v-else-if="
                  canEdit &&
                  field.teacher_editable &&
                  !field.inherited &&
                  field.type === 'repetible'
                "
                :id="`field-${field.id}`"
                class="table-wrap"
              >
                <p v-if="!block.table">
                  Esta tabla no tiene una estructura configurada.
                </p>
                <template v-else>
                  <SyllabusTableEditor
                    :layout="block.table"
                    :rows="field.rows"
                    :disabled="savingFieldId === field.id || conflict"
                    @update:rows="updateRows(field, $event)"
                  />
                  <span v-if="savingFieldId === field.id" class="save-status"
                    >Guardando…</span
                  >
                </template>
              </div>
              <div v-else :id="`field-${field.id}`" class="syllabus-readonly-field">
                <strong>{{ field.label }}</strong>
                <SyllabusTableView
                  v-if="field.type === 'repetible' && block.table"
                  :layout="block.table"
                  :rows="field.rows"
                />
                <SnapshotValue v-else :value="field.value" :rows="field.rows" />
              </div>
            </template>
          </template>
        </section>
        </article>
      </section>
      <section
        v-if="
          syllabus.state === 'borrador' ||
          syllabus.state === 'correccion_solicitada'
        "
        class="detail-card"
      >
        <h2>Revisión del borrador</h2>
        <button
          v-if="syllabus.completion === 100"
          type="button"
          :disabled="processingAction || conflict"
          @click="validate"
        >
          Validar sílabo
        </button>
        <p v-else class="save-status">
          Complete todos los campos obligatorios para validar el sílabo.
        </p>
        <ul v-if="validationResults.length" class="validation-results">
          <li v-for="issue in validationResults" :key="`${issue.code}-${issue.field_id}`">
            <button
              v-if="issue.field_id"
              type="button"
              class="inline-action"
              @click="navigateToField(issue.field_id)"
            >{{ issue.message }}</button>
            <span v-else>{{ issue.message }}</span>
          </li>
        </ul>
        <button
          v-if="
            validationRan &&
            validationBlockingErrors === 0 &&
            syllabus.completion === 100
          "
          type="button"
          :disabled="processingAction || conflict"
          @click="submit"
        >
          Enviar a revisión
        </button>
        <p v-if="aiMessage" class="save-status">{{ aiMessage }}</p>
      </section>
      <SyllabusAiChat
        ref="aiChat"
        :syllabus-id="syllabus.id"
        :draft-version="syllabus.version_bloqueo"
        @navigate-to-field="navigateToField"
        @recommendation-applied="recommendationApplied"
      />
      <section v-if="syllabus.observations.length" class="detail-card">
        <h2>Observaciones</h2>
        <article
          v-for="observation in syllabus.observations"
          :key="observation.id"
        >
          <p>{{ observation.content }}</p>
          <p v-if="observation.response">{{ observation.response.content }}</p>
          <template v-else>
            <textarea
              v-model="responseDrafts[observation.id]"
              placeholder="Ej. Corrección realizada"
            /><button
              type="button"
              :disabled="answeringObservationId === observation.id"
              @click="answer(observation.id)"
            >
              {{ answeringObservationId === observation.id ? "Enviando…" : "Responder" }}
            </button></template
          >
        </article>
      </section>
    </template>
    <p v-else>Cargando sílabo…</p>
  </main>
</template>
