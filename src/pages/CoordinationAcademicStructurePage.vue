<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import {
  createCareerRecord,
  createCareerTeacher,
  createParallels,
  createSubjectRequirement,
  deleteCareerRecord,
  deleteScheduledSubject,
  deleteSubjectRequirement,
  getCurriculum,
  getScheduledSubjects,
  getTeacherAssignments,
  preparePeriod,
  relieveCareerTeacher,
  setCareerRecordStatus,
  updateCurriculumConfiguration,
  updateCareerRecord,
  uploadFacultyLogo,
  type Curriculum,
  type ScheduledSubjects,
  type TeacherAssignments,
} from "@/api/career-academics";
import { getSession } from "@/api/session";
import FormSheet from "@/components/FormSheet.vue";

const router = useRouter();
const curriculum = ref<Curriculum | null>(null);
const schedule = ref<ScheduledSubjects | null>(null);
const assignments = ref<TeacherAssignments | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const saving = ref(false);
const subject = reactive({
  code: "",
  nombre: "",
  cycle: 1,
  position: 0,
  organization_unit: "Unidad profesional",
  modality: "",
  creditos: 0,
  horas_ac: 0,
  horas_pae: 0,
  horas_aa: 0,
  hours_project: 0,
  hours_ap: 0,
  hours_paec: 0,
});
const period = reactive({ period_id: "" });
const assignment = reactive({ user_id: "", parallel_id: "" });
const curriculumForm = reactive({ code: "", cycle_count: 1 });
const teacherOpen = ref(false);
const subjectEditOpen = ref(false);
const teacher = reactive({ nombre: "", correo_electronico: "", password: "" });
const relief = reactive({ outgoing_user_id: "", incoming_user_id: "" });
const logoFile = ref<File | null>(null);
const editingSubject = reactive({
  id: "",
  code: "",
  nombre: "",
  cycle: 1,
  position: 0,
  organization_unit: "",
  modality: "",
  creditos: 0,
  horas_ac: 0,
  horas_pae: 0,
  horas_aa: 0,
  hours_project: 0,
  hours_ap: 0,
  hours_paec: 0,
});
const requirement = reactive({
  subject_id: "",
  requirement_id: "",
  type: "prerrequisito",
});
const parallelBatch = reactive({
  scheduled_subject_id: "",
  codes: "",
  shift: "",
});
const periodSubjects = ref<
  Record<string, { selected: boolean; codes: string; shift: string }>
>({});
const load = async () => {
  try {
    const session = await getSession();
    if (
      session.active_role?.code !== "coordinador" ||
      !session.active_role.career_id
    ) {
      await router.replace("/panel");
      return;
    }
    const [nextCurriculum, nextSchedule, nextAssignments] = await Promise.all([
      getCurriculum(session.active_role.career_id),
      getScheduledSubjects(),
      getTeacherAssignments(),
    ]);
    curriculum.value = nextCurriculum;
    schedule.value = nextSchedule;
    assignments.value = nextAssignments;
    curriculumForm.code = nextCurriculum.curriculum.code;
    curriculumForm.cycle_count = nextCurriculum.curriculum.cycle_count;
    period.period_id ||= nextSchedule.selectedPeriodId ?? "";
    for (const item of nextSchedule.options.activeSubjects)
      periodSubjects.value[item.id] ??= {
        selected: false,
        codes: "A",
        shift: "",
      };
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo cargar la estructura académica.";
  }
};
const run = async (operation: () => Promise<{ message: string }>) => {
  try {
    saving.value = true;
    error.value = null;
    message.value = (await operation()).message;
    await load();
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo completar la operación.";
  } finally {
    saving.value = false;
  }
};
const createSubject = () =>
  run(() =>
    createCareerRecord("asignatura", {
      ...subject,
      modality: subject.modality || null,
    }),
  );
const scheduleSubject = () =>
  run(() =>
    preparePeriod({
      period_id: period.period_id,
      subjects: Object.entries(periodSubjects.value)
        .filter(([, value]) => value.selected)
        .map(([id, value]) => ({
          id,
          parallels: value.codes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
            .map((code) => ({ code, shift: value.shift || null })),
        })),
    }),
  );
const assignTeacher = () =>
  run(() => createCareerRecord("asignacion_docente", { ...assignment }));
const saveTeacher = () =>
  run(async () => {
    const result = await createCareerTeacher({ ...teacher });
    teacher.nombre = "";
    teacher.correo_electronico = "";
    teacher.password = "";
    teacherOpen.value = false;
    return result;
  });
const relieve = () =>
  run(() =>
    relieveCareerTeacher({ ...relief, idempotency_key: crypto.randomUUID() }),
  );
const saveLogo = () => {
  if (logoFile.value) void run(() => uploadFacultyLogo(logoFile.value!));
};
const chooseLogo = (event: Event) => {
  logoFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
};
const editSubject = (item: Curriculum["subjects"][number]) => {
  Object.assign(editingSubject, {
    id: item.id,
    code: item.code,
    nombre: item.name,
    cycle: item.cycle,
    position: item.position ?? 0,
    organization_unit: item.organization_unit,
    modality: item.modality ?? "",
    creditos: Number(item.system_values.creditos ?? 0),
    horas_ac: Number(item.system_values.horas_ac ?? 0),
    horas_pae: Number(item.system_values.horas_pae ?? 0),
    horas_aa: Number(item.system_values.horas_aa ?? 0),
    hours_project: Number(item.system_values.hours_project ?? 0),
    hours_ap: Number(item.system_values.hours_ap ?? 0),
    hours_paec: Number(item.system_values.hours_paec ?? 0),
  });
  subjectEditOpen.value = true;
};
const saveSubject = () =>
  run(async () => {
    const result = await updateCareerRecord("asignatura", editingSubject.id, {
      ...editingSubject,
      id: undefined,
      modality: editingSubject.modality || null,
    });
    subjectEditOpen.value = false;
    return result;
  });
const addRequirement = () =>
  run(() =>
    createSubjectRequirement(curriculum.value!.curriculum.id, {
      ...requirement,
    }),
  );
const removeRequirement = (id: string) =>
  run(() => deleteSubjectRequirement(curriculum.value!.curriculum.id, id));
const addParallels = () =>
  run(() =>
    createParallels({
      scheduled_subject_id: parallelBatch.scheduled_subject_id,
      codes: parallelBatch.codes
        .split(",")
        .map((code) => code.trim())
        .filter(Boolean),
      shift: parallelBatch.shift || null,
    }),
  );
const removeSchedule = (id: string) => {
  if (
    window.confirm(
      "¿Eliminar esta materia programada y sus paralelos sin historial?",
    )
  )
    void run(() => deleteScheduledSubject(id));
};
onMounted(() => {
  void load();
});
</script>
<template>
  <main class="app-page">
    <header class="app-header">
      <div>
        <p class="eyebrow">Coordinación</p>
        <h1>Estructura académica de la carrera</h1>
        <p>Malla, programación por período, paralelos y docentes.</p>
      </div>
      <button
        v-if="assignments?.canCreateTeacher"
        class="primary-action"
        type="button"
        @click="teacherOpen = true"
      >
        Gestionar docente
      </button>
    </header>
    <p v-if="message" class="save-status" role="status">{{ message }}</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="curriculum && schedule && assignments"
      ><section class="detail-card">
        <h2>Logo de la facultad</h2>
        <form class="editor-form compact-form" @submit.prevent="saveLogo">
          <label
            >Archivo PNG
            <input type="file" accept="image/png" required @change="chooseLogo"
          /></label>
          <button :disabled="saving || !logoFile">Actualizar logo</button>
        </form>
      </section>
      <p v-if="curriculum.curriculum.lock_reason" role="alert">
        {{ curriculum.curriculum.lock_reason }}
      </p>
      <section class="detail-card">
        <h2>Malla · {{ curriculum.career.name }}</h2>
        <form
          class="editor-form compact-form"
          @submit.prevent="
            run(() =>
              updateCurriculumConfiguration(curriculum!.curriculum.id, {
                ...curriculumForm,
              }),
            )
          "
        >
          <label
            >Código de malla<input
              v-model="curriculumForm.code"
              required
              :disabled="!curriculum.curriculum.editable" /></label
          ><label
            >Ciclos<input
              v-model.number="curriculumForm.cycle_count"
              type="number"
              min="1"
              required
              :disabled="!curriculum.curriculum.editable" /></label
          ><button :disabled="saving || !curriculum.curriculum.editable">
            Guardar configuración
          </button>
        </form>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Asignatura</th>
                <th>Ciclo</th>
                <th>Créditos</th>
                <th>Horas</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in curriculum.subjects" :key="item.id">
                <td>{{ item.code }}</td>
                <td>
                  {{ item.name }}<small>{{ item.organization_unit }}</small>
                </td>
                <td>{{ item.cycle }}</td>
                <td>{{ item.credits }}</td>
                <td>{{ item.total_hours }}</td>
                <td>{{ item.active ? "Activa" : "Inactiva" }}</td>
                <td class="process-actions">
                  <button
                    type="button"
                    :disabled="saving || !curriculum.curriculum.editable"
                    @click="editSubject(item)"
                  >
                    Editar
                  </button>
                  <button
                    :disabled="saving || !curriculum.curriculum.editable"
                    @click="
                      run(() =>
                        setCareerRecordStatus(
                          'asignatura',
                          item.id,
                          !item.active,
                        ),
                      )
                    "
                  >
                    {{ item.active ? "Desactivar" : "Activar" }}</button
                  ><button
                    :disabled="saving || !curriculum.curriculum.editable"
                    @click="
                      run(() => deleteCareerRecord('asignatura', item.id))
                    "
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <form class="editor-form" @submit.prevent="createSubject">
          <h3>Agregar asignatura</h3>
          <div class="form-grid">
            <label>Código<input v-model="subject.code" required /></label
            ><label>Nombre<input v-model="subject.nombre" required /></label
            ><label
              >Ciclo<input
                v-model.number="subject.cycle"
                type="number"
                min="1"
                required /></label
            ><label
              >Orden<input
                v-model.number="subject.position"
                type="number"
                min="0" /></label
            ><label
              >Unidad organizativa<input
                v-model="subject.organization_unit"
                required /></label
            ><label
              >Modalidad<select v-model="subject.modality">
                <option value="">Heredar de carrera</option>
                <option
                  v-for="option in curriculum.modalityOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select></label
            ><label
              >Créditos<input
                v-model.number="subject.creditos"
                type="number"
                min="0"
                step=".01"
                required /></label
            ><label
              >Horas ACD<input
                v-model.number="subject.horas_ac"
                type="number"
                min="0"
                step=".01"
                required /></label
            ><label
              >Horas APE<input
                v-model.number="subject.horas_pae"
                type="number"
                min="0"
                step=".01"
                required /></label
            ><label
              >Horas AA<input
                v-model.number="subject.horas_aa"
                type="number"
                min="0"
                step=".01"
                required
            /></label>
          </div>
          <button :disabled="saving || !curriculum.curriculum.editable">
            Agregar asignatura
          </button>
        </form>
        <section class="nested-section">
          <h3>Prerrequisitos y correquisitos</h3>
          <ul class="relationship-list">
            <li v-for="item in curriculum.requirements" :key="item.id">
              <span
                >{{
                  curriculum.subjects.find(
                    (subject) => subject.id === item.subject_id,
                  )?.code
                }}
                requiere
                {{
                  curriculum.subjects.find(
                    (subject) => subject.id === item.requirement_id,
                  )?.code
                }}
                ({{ item.type }})</span
              ><button
                type="button"
                :disabled="saving || !curriculum.curriculum.editable"
                @click="removeRequirement(item.id)"
              >
                Eliminar
              </button>
            </li>
          </ul>
          <form
            class="editor-form compact-form"
            @submit.prevent="addRequirement"
          >
            <label
              >Asignatura
              <select v-model="requirement.subject_id" required>
                <option value="">Seleccione</option>
                <option
                  v-for="item in curriculum.subjects"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.code }} · {{ item.name }}
                </option>
              </select></label
            ><label
              >Requisito
              <select v-model="requirement.requirement_id" required>
                <option value="">Seleccione</option>
                <option
                  v-for="item in curriculum.subjects.filter(
                    (subject) => subject.id !== requirement.subject_id,
                  )"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.code }} · {{ item.name }}
                </option>
              </select></label
            ><label
              >Tipo
              <select v-model="requirement.type">
                <option value="prerrequisito">Prerrequisito</option>
                <option value="correquisito">Correquisito</option>
              </select></label
            ><button :disabled="saving || !curriculum.curriculum.editable">
              Agregar relación
            </button>
          </form>
        </section>
      </section>
      <section class="detail-card">
        <h2>Programación y paralelos</h2>
        <p v-if="schedule.career.lock_reason" role="alert">
          {{ schedule.career.lock_reason }}
        </p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Asignatura</th>
                <th>Período</th>
                <th>Campus</th>
                <th>Paralelos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in schedule.scheduledSubjects" :key="item.id">
                <td>{{ item.label }}</td>
                <td>{{ item.period_status_label }}</td>
                <td>{{ item.campus_name }}</td>
                <td>
                  {{
                    item.parallels.map((parallel) => parallel.code).join(", ")
                  }}
                </td>
                <td>{{ item.active ? "Activa" : "Inactiva" }}</td>
                <td>
                  <button
                    v-if="item.editable"
                    type="button"
                    @click="removeSchedule(item.id)"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <form
          class="editor-form compact-form"
          @submit.prevent="scheduleSubject"
        >
          <h3>Preparar período</h3>
          <label
            >Período<select v-model="period.period_id" required>
              <option value="">Seleccione</option>
              <option
                v-for="item in schedule.options.periods.filter(
                  (item) => item.planning_enabled,
                )"
                :key="item.id"
                :value="item.id"
              >
                {{ item.code }}
              </option>
            </select></label
          >
          <div class="prepare-subjects">
            <article
              v-for="item in schedule.options.activeSubjects"
              :key="item.id"
            >
              <label class="checkbox-row"
                ><input
                  v-model="periodSubjects[item.id].selected"
                  type="checkbox"
                />
                {{ item.codigo_asignatura }} · {{ item.nombre }}</label
              ><template v-if="periodSubjects[item.id].selected"
                ><label
                  >Paralelos separados por coma
                  <input
                    v-model="periodSubjects[item.id].codes"
                    placeholder="Ej. A, B"
                    required /></label
                ><label
                  >Jornada
                  <select v-model="periodSubjects[item.id].shift">
                    <option value="">Sin especificar</option>
                    <option value="matutina">Matutina</option>
                    <option value="vespertina">Vespertina</option>
                    <option value="nocturna">Nocturna</option>
                  </select></label
                ></template
              >
            </article>
          </div>
          ><button :disabled="saving || Boolean(schedule.career.lock_reason)">
            Preparar materias seleccionadas
          </button>
        </form>
        <form class="editor-form compact-form" @submit.prevent="addParallels">
          <h3>Agregar paralelos</h3>
          <label
            >Materia programada
            <select v-model="parallelBatch.scheduled_subject_id" required>
              <option value="">Seleccione</option>
              <option
                v-for="item in schedule.options.scheduledSubjects"
                :key="item.id"
                :value="item.id"
              >
                {{ item.label }}
              </option>
            </select></label
          ><label
            >Códigos separados por coma
            <input
              v-model="parallelBatch.codes"
              placeholder="Ej. B, C"
              required /></label
          ><label
            >Jornada
            <select v-model="parallelBatch.shift">
              <option value="">Sin especificar</option>
              <option value="matutina">Matutina</option>
              <option value="vespertina">Vespertina</option>
              <option value="nocturna">Nocturna</option>
            </select></label
          ><button :disabled="saving || Boolean(schedule.career.lock_reason)">
            Agregar paralelos
          </button>
        </form>
      </section>
      <section class="detail-card">
        <h2>Asignaciones docentes</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Docente</th>
                <th>Asignatura</th>
                <th>Paralelo</th>
                <th>Período</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in assignments.teacherAssignments" :key="item.id">
                <td>
                  {{ item.user_name }}<small>{{ item.user_email }}</small>
                </td>
                <td>{{ item.subject_name }}</td>
                <td>{{ item.parallel_code }}</td>
                <td>{{ item.period_name }}</td>
                <td>{{ item.active ? "Vigente" : "Finalizada" }}</td>
                <td>
                  <button
                    v-if="item.active"
                    type="button"
                    @click="relief.outgoing_user_id = item.user_id"
                  >
                    Relevar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <form class="editor-form compact-form" @submit.prevent="assignTeacher">
          <h3>Asignar docente a paralelo</h3>
          <label
            >Docente<select v-model="assignment.user_id" required>
              <option value="">Seleccione</option>
              <option
                v-for="item in assignments.options.teacherUsers"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }} · {{ item.email }}
              </option>
            </select></label
          ><label
            >Paralelo<select v-model="assignment.parallel_id" required>
              <option value="">Seleccione</option>
              <option
                v-for="item in assignments.options.parallels"
                :key="item.id"
                :value="item.id"
              >
                {{ item.label }}
              </option>
            </select></label
          ><button
            :disabled="saving || Boolean(assignments.career.lock_reason)"
          >
            Asignar docente
          </button>
        </form>
        <form
          v-if="relief.outgoing_user_id"
          class="editor-form compact-form"
          @submit.prevent="relieve"
        >
          <h3>Relevar docente</h3>
          <p>
            Se transferirán todos los paralelos de la carrera que permitan el
            cambio.
          </p>
          <label
            >Docente entrante<select v-model="relief.incoming_user_id" required>
              <option value="">Seleccione</option>
              <option
                v-for="item in assignments.options.teacherUsers.filter(
                  (teacher) => teacher.id !== relief.outgoing_user_id,
                )"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }} · {{ item.email }}
              </option>
            </select></label
          >
          <div class="header-actions">
            <button
              type="button"
              @click="
                relief.outgoing_user_id = '';
                relief.incoming_user_id = '';
              "
            >
              Cancelar</button
            ><button
              :disabled="saving || Boolean(assignments.career.lock_reason)"
            >
              Confirmar relevo
            </button>
          </div>
        </form>
      </section></template
    >
    <p v-else-if="!error">Cargando estructura académica…</p>
    <FormSheet
      :open="teacherOpen"
      title="Gestionar docente"
      description="Cree una cuenta nueva o incorpore una existente por su correo."
      @close="teacherOpen = false"
    >
      <form class="editor-form" @submit.prevent="saveTeacher">
        <label
          >Nombre
          <input
            v-model="teacher.nombre"
            placeholder="Ej. Ana Pérez"
            required /></label
        ><label
          >Correo institucional
          <input
            v-model="teacher.correo_electronico"
            type="email"
            placeholder="Ej. ana.perez@ueb.edu.ec"
            required /></label
        ><label
          >Contraseña temporal
          <input v-model="teacher.password" type="password" required
        /></label>
        <div class="form-sheet-actions">
          <button type="button" @click="teacherOpen = false">Cancelar</button
          ><button :disabled="saving" type="submit">Guardar docente</button>
        </div>
      </form>
    </FormSheet>
    <FormSheet
      :open="subjectEditOpen"
      title="Editar asignatura"
      description="Actualice los datos fijos de la materia dentro de la malla."
      @close="subjectEditOpen = false"
      ><form class="editor-form" @submit.prevent="saveSubject">
        <div class="form-grid">
          <label>Código <input v-model="editingSubject.code" required /></label
          ><label
            >Nombre <input v-model="editingSubject.nombre" required /></label
          ><label
            >Ciclo
            <input
              v-model.number="editingSubject.cycle"
              type="number"
              min="1"
              required /></label
          ><label
            >Orden
            <input
              v-model.number="editingSubject.position"
              type="number"
              min="0" /></label
          ><label
            >Unidad organizativa
            <input v-model="editingSubject.organization_unit" required /></label
          ><label
            >Modalidad
            <select v-model="editingSubject.modality">
              <option value="">Heredar de carrera</option>
              <option
                v-for="option in curriculum?.modalityOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select></label
          ><label
            >Créditos
            <input
              v-model.number="editingSubject.creditos"
              type="number"
              min="0"
              step=".01"
              required /></label
          ><label
            >Horas ACD
            <input
              v-model.number="editingSubject.horas_ac"
              type="number"
              min="0"
              required /></label
          ><label
            >Horas APE
            <input
              v-model.number="editingSubject.horas_pae"
              type="number"
              min="0"
              required /></label
          ><label
            >Horas AA
            <input
              v-model.number="editingSubject.horas_aa"
              type="number"
              min="0"
              required
          /></label>
        </div>
        <div class="form-sheet-actions">
          <button type="button" @click="subjectEditOpen = false">
            Cancelar</button
          ><button :disabled="saving">Guardar cambios</button>
        </div>
      </form></FormSheet
    >
  </main>
</template>
