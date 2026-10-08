<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { ArrowLeft, Pencil, UserPlus } from "@lucide/vue";
import { useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import AppearanceToggle from "@/components/AppearanceToggle.vue";
import {
  getCurriculum,
  getScheduledSubjects,
  getTeacherAssignments,
  type Curriculum,
  type ScheduledSubjects,
  type TeacherAssignments,
} from "@/api/career-academics";
import { getSession } from "@/api/session";
import PageFrame from "@/components/domain/PageFrame.vue";
import LoadingSkeleton from "@/components/domain/LoadingSkeleton.vue";
import LoadErrorState from "@/components/domain/LoadErrorState.vue";
import ManagedUserSheet from "@/components/domain/identity/ManagedUserSheet.vue";
import CurriculumActions from "@/components/domain/academic/CurriculumActions.vue";
import CurriculumCanvas from "@/components/domain/academic/curriculum/CurriculumCanvas.vue";
import CurriculumConfigurationSheet from "@/components/domain/academic/curriculum/CurriculumConfigurationSheet.vue";
import PeriodPreparationSheet from "@/components/domain/academic/PeriodPreparationSheet.vue";
import ScheduledSubjectsTab from "@/components/domain/academic/ScheduledSubjectsTab.vue";
import ImportSpreadsheetDialog from "@/components/domain/ImportSpreadsheetDialog.vue";
import TeacherAssignmentsPanel from "@/components/domain/academic/TeacherAssignmentsPanel.vue";
import ProcessLockAlert from "@/components/domain/ProcessLockAlert.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { preparationRows } from "@/lib/periodPreparation";
import { paths } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { curriculumEditorState } from "@/state/curriculumEditor";

const router = useRouter();
const props = defineProps<{ mode: 'curriculum' | 'schedule' | 'teachers' }>();
const pageTitle = computed(() => ({
  curriculum: 'Malla',
  schedule: 'Materias y asignaciones',
  teachers: 'Docentes',
})[props.mode]);
const pageDescription = computed(() => ({
  curriculum: 'Malla curricular de su carrera.',
  schedule: 'Materias y paralelos de su carrera del período en curso.',
  teachers: 'Docentes de su carrera.',
})[props.mode]);
// Mientras falte programar materias de la malla, el botón principal es Asignar materias.
const pendingPreparation = computed(() => {
  if (!schedule.value || !assignments.value || !schedule.value.selectedPeriodId) return false;
  const period = schedule.value.options.periods.find((item) => item.id === schedule.value?.selectedPeriodId);
  if (!period?.planning_enabled) return false;
  return preparationRows(period.id, schedule.value.options, schedule.value.scheduledSubjects, assignments.value.teacherAssignments, assignments.value.options.teacherUsers).rows.length > 0;
});
const curriculum = ref<Curriculum | null>(null);
const schedule = ref<ScheduledSubjects | null>(null);
const assignments = ref<TeacherAssignments | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const teacherOpen = ref(false);
const configurationOpen = ref(false);
const editingCurriculum = ref(false);
const openingEditor = ref(false);
watch(editingCurriculum, (editing) => curriculumEditorState.setOpen(editing), { immediate: true });
watch(() => curriculum.value?.curriculum, (current) => {
  if (current && (!current.editable || current.lock_reason)) {
    editingCurriculum.value = false;
    configurationOpen.value = false;
  }
});
watch(() => props.mode, (mode) => {
  if (mode !== 'curriculum') {
    editingCurriculum.value = false;
    configurationOpen.value = false;
  }
});
const removeLegacyBreakdownMode = () => {
  const url = new URL(window.location.href);
  if (url.searchParams.get('modo') !== 'desglose') return;
  url.searchParams.delete('modo');
  window.history.replaceState(window.history.state, '', url);
};
const load = async () => {
  loading.value = true;
  loadError.value = null;
  try {
    const session = await getSession();
    if (
      session.active_role?.code !== "coordinador" ||
      !session.active_role.career_id
    ) {
      await router.replace(paths.dashboard);
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
  } catch (reason) {
    loadError.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo cargar la estructura académica.";
  } finally {
    loading.value = false;
  }
};
const reloadSchedule = async (periodId?: string) => {
  try {
    actionError.value = null;
    schedule.value = await getScheduledSubjects(periodId);
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : "No se pudo actualizar la programación académica.";
  }
};
const handleScheduleChanged = async (notice: string) => {
  toast.success(notice);
  await Promise.all([reloadSchedule(schedule.value?.selectedPeriodId ?? undefined), reloadAssignments()]);
};
const handlePeriodPrepared = async (notice: string, periodId: string) => {
  toast.success(notice);
  await Promise.all([reloadSchedule(periodId), reloadAssignments()]);
};
const reloadAssignments = async () => {
  try {
    actionError.value = null;
    assignments.value = await getTeacherAssignments();
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : "No se pudieron actualizar las asignaciones docentes.";
  }
};
const handleAssignmentChanged = async (notice: string) => {
  toast.success(notice);
  await Promise.all([reloadAssignments(), reloadSchedule(schedule.value?.selectedPeriodId ?? undefined)]);
};
const reloadCurriculum = async () => {
  try {
    const careerId = curriculum.value?.career.id;
    if (!careerId) return;
    actionError.value = null;
    curriculum.value = await getCurriculum(careerId);
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : "No se pudo actualizar la malla.";
  }
};
const handleCurriculumChanged = async (notice: string) => {
  toast.success(notice);
  await reloadCurriculum();
};
const openCurriculumEditor = async () => {
  const careerId = curriculum.value?.career.id;
  if (!careerId || openingEditor.value) return;
  openingEditor.value = true;
  actionError.value = null;
  try {
    const current = await getCurriculum(careerId);
    curriculum.value = current;
    editingCurriculum.value = current.curriculum.editable && !current.curriculum.lock_reason;
  } catch (reason) {
    actionError.value = reason instanceof ApiError ? reason.message : "No se pudo comprobar si la malla puede editarse.";
  } finally {
    openingEditor.value = false;
  }
};
const closeCurriculumEditor = () => {
  configurationOpen.value = false;
  editingCurriculum.value = false;
};
onMounted(() => {
  if (props.mode === 'curriculum') removeLegacyBreakdownMode();
  void load();
});
onBeforeUnmount(() => curriculumEditorState.setOpen(false));
</script>
<template>
  <div v-if="mode === 'curriculum' && editingCurriculum && curriculum && schedule && assignments" class="flex min-h-dvh min-w-0 flex-col bg-background">
    <header class="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b bg-background/95 px-3 shadow-sm backdrop-blur sm:px-5" aria-label="Herramientas del editor de malla">
      <Button variant="link" size="sm" class="h-auto px-0" @click="closeCurriculumEditor"><ArrowLeft aria-hidden="true" />Volver a la vista</Button>
      <span class="hidden min-w-0 flex-1 truncate text-center text-sm font-medium sm:block">Malla de {{ curriculum.career.name }}</span>
      <CurriculumActions :curriculum="curriculum.curriculum" @configure="configurationOpen = true" />
      <AppearanceToggle />
    </header>
    <div class="min-w-0 flex-1 p-3 sm:p-4">
      <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
      <CurriculumCanvas :career="curriculum.career" :modality-options="curriculum.modalityOptions" :curriculum="curriculum.curriculum" :fixed-fields="curriculum.fixedFields" :fixed-field-totals="curriculum.fixedFieldTotals" :subjects="curriculum.subjects" :requirements="curriculum.requirements" :organization-units="curriculum.organizationUnitOptions" :editing="true" :full-screen="true" @changed="handleCurriculumChanged" />
      <CurriculumConfigurationSheet v-model:open="configurationOpen" :curriculum="curriculum.curriculum" @saved="handleCurriculumChanged" />
    </div>
  </div>
  <PageFrame
    v-else
    :title="pageTitle"
    :description="pageDescription"
    :size="mode === 'curriculum' ? 'full' : 'wide'"
  >
    <template #actions>
      <PeriodPreparationSheet
        v-if="mode === 'schedule' && schedule && assignments && pendingPreparation"
        :scheduled-subjects="schedule.scheduledSubjects"
        :options="schedule.options"
        :assignments="assignments.teacherAssignments"
        :teacher-users="assignments.options.teacherUsers"
        :initial-period-id="schedule.selectedPeriodId"
        :disabled="Boolean(schedule.career.lock_reason)"
        @saved="handlePeriodPrepared"
      />
      <ImportSpreadsheetDialog
        v-if="mode === 'teachers' && assignments?.canCreateTeacher"
        title="Importar docentes"
        description="Cree varios docentes de su carrera a la vez."
        endpoint="/coordination/academic/teachers/import"
        template-endpoint="/coordination/academic/teachers/import-template"
        template-name="plantilla-docentes.xlsx"
        :columns="[{ key: 'nombre', label: 'Nombre' }, { key: 'correo', label: 'Correo' }]"
        @imported="handleAssignmentChanged"
      />
      <Button v-if="mode === 'teachers' && assignments?.canCreateTeacher" @click="teacherOpen = true"><UserPlus data-icon="inline-start" aria-hidden="true" />Crear docente</Button>
      <ImportSpreadsheetDialog
        v-if="mode === 'curriculum' && curriculum && curriculum.curriculum.editable && !curriculum.curriculum.lock_reason"
        title="Importar malla"
        description="Cree las materias de la malla, con sus horas y requisitos, desde un Excel."
        endpoint="/coordination/academic/curriculum-import"
        template-endpoint="/coordination/academic/curriculum-import/template"
        template-name="plantilla-malla.xlsx"
        :columns="[{ key: 'codigo', label: 'Código' }, { key: 'nombre', label: 'Materia' }, { key: 'ciclo', label: 'Ciclo' }, { key: 'unidad', label: 'Unidad' }]"
        @imported="handleCurriculumChanged"
      />
      <Button
        v-if="mode === 'curriculum' && curriculum"
        :disabled="openingEditor || !curriculum.curriculum.editable || Boolean(curriculum.curriculum.lock_reason)"
        @click="openCurriculumEditor"
      ><Spinner v-if="openingEditor" data-icon="inline-start" /><Pencil v-else data-icon="inline-start" aria-hidden="true" />{{ openingEditor ? 'Comprobando…' : 'Editar malla' }}</Button>
    </template>
    <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <template v-if="curriculum && schedule && assignments"
      >
      <template v-if="mode === 'curriculum'">
        <ProcessLockAlert v-if="curriculum.curriculum.lock_reason" :lock="curriculum.curriculum.lock" />
        <CurriculumCanvas :career="curriculum.career" :modality-options="curriculum.modalityOptions" :curriculum="curriculum.curriculum" :fixed-fields="curriculum.fixedFields" :fixed-field-totals="curriculum.fixedFieldTotals" :subjects="curriculum.subjects" :requirements="curriculum.requirements" :organization-units="curriculum.organizationUnitOptions" :editing="false" @changed="handleCurriculumChanged" />
      </template>
      <ProcessLockAlert v-if="mode === 'schedule' && schedule.career.lock_reason" :lock="schedule.career.lock" />
      <ScheduledSubjectsTab
        v-if="mode === 'schedule'"
        :data="schedule"
        :assignments="assignments.teacherAssignments"
        :teacher-users="assignments.options.teacherUsers"
        @period="reloadSchedule"
        @changed="handleScheduleChanged"
        @failed="actionError = $event"
      />
      <TeacherAssignmentsPanel v-if="mode === 'teachers'" :data="assignments" @changed="handleAssignmentChanged" />
      </template
    >
    <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="academic-structure" :mode="mode" :columns="mode === 'teachers' ? 4 : 6" :filters="mode === 'schedule' ? 3 : 1" />
    <ManagedUserSheet
      v-if="mode === 'teachers'"
      v-model:open="teacherOpen"
      :teacher-career="assignments?.career ?? null"
      :show-trigger="false"
      @saved="handleAssignmentChanged"
    />
  </PageFrame>
</template>
