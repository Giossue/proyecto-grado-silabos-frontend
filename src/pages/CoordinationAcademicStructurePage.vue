<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ChevronDown, UserPlus } from "@lucide/vue";
import { useRouter } from "vue-router";
import { ApiError } from "@/api/client";
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
import TeacherAssignmentSheet from "@/components/domain/academic/TeacherAssignmentSheet.vue";
import TeacherAssignmentsPanel from "@/components/domain/academic/TeacherAssignmentsPanel.vue";
import ProcessLockAlert from "@/components/domain/ProcessLockAlert.vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { paths } from "@/lib/routes";
import { toast } from "@/lib/toast";

const router = useRouter();
const props = defineProps<{ mode: 'curriculum' | 'schedule' | 'teachers' }>();
const pageTitle = computed(() => ({
  curriculum: 'Malla',
  schedule: 'Materias y paralelos',
  teachers: 'Asignación docente',
})[props.mode]);
const pageDescription = computed(() => {
  const career = curriculum.value?.career.name ?? 'la carrera activa';
  return {
    curriculum: `Malla curricular de ${career}. Gestione las materias y sus relaciones en el constructor interactivo.`,
    schedule: `Prepare cada período con la malla completa de ${career}, sus paralelos y docentes.`,
    teachers: `Quién dicta cada paralelo en ${career}.`,
  }[props.mode];
});
const curriculum = ref<Curriculum | null>(null);
const schedule = ref<ScheduledSubjects | null>(null);
const assignments = ref<TeacherAssignments | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const teacherOpen = ref(false);
const assignmentOpen = ref(false);
const configurationOpen = ref(false);
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
  await reloadSchedule(schedule.value?.selectedPeriodId ?? undefined);
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
  await reloadAssignments();
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
onMounted(() => {
  if (props.mode === 'curriculum') removeLegacyBreakdownMode();
  void load();
});
</script>
<template>
  <PageFrame
    :title="pageTitle"
    :description="pageDescription"
  >
    <template #actions>
      <PeriodPreparationSheet
        v-if="mode === 'schedule' && schedule && assignments && schedule.options.periods.some((item) => item.planning_enabled)"
        :scheduled-subjects="schedule.scheduledSubjects"
        :options="schedule.options"
        :assignments="assignments.teacherAssignments"
        :teacher-users="assignments.options.teacherUsers"
        :initial-period-id="schedule.selectedPeriodId"
        :disabled="Boolean(schedule.career.lock_reason)"
        @saved="handlePeriodPrepared"
      />
      <DropdownMenu v-if="mode === 'teachers' && assignments">
        <DropdownMenuTrigger as-child><Button><UserPlus data-icon="inline-start" aria-hidden="true" />Gestionar docente<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuGroup>
          <DropdownMenuItem v-if="assignments.canCreateTeacher" @select="teacherOpen = true">Crear docente</DropdownMenuItem>
          <DropdownMenuItem @select="assignmentOpen = true">Asignar docente</DropdownMenuItem>
        </DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu>
      <TeacherAssignmentSheet
        v-if="mode === 'teachers' && assignments"
        v-model:open="assignmentOpen"
        :options="assignments.options"
        :show-trigger="false"
        @saved="handleAssignmentChanged"
      />
      <CurriculumActions
        v-if="mode === 'curriculum' && curriculum"
        :curriculum="curriculum.curriculum"
        @configure="configurationOpen = true"
      />
    </template>
    <Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert>
    <template v-if="curriculum && schedule && assignments"
      >
      <template v-if="mode === 'curriculum'">
        <ProcessLockAlert v-if="curriculum.curriculum.lock_reason" />
        <CurriculumCanvas :career="curriculum.career" :modality-options="curriculum.modalityOptions" :curriculum="curriculum.curriculum" :fixed-fields="curriculum.fixedFields" :fixed-field-totals="curriculum.fixedFieldTotals" :subjects="curriculum.subjects" :requirements="curriculum.requirements" :organization-units="curriculum.organizationUnitOptions" @changed="handleCurriculumChanged" />
        <CurriculumConfigurationSheet v-model:open="configurationOpen" :curriculum="curriculum.curriculum" @saved="handleCurriculumChanged" />
      </template>
      <ProcessLockAlert v-if="mode === 'schedule' && schedule.career.lock_reason" />
      <ScheduledSubjectsTab
        v-if="mode === 'schedule'"
        :data="schedule"
        @period="reloadSchedule"
        @changed="handleScheduleChanged"
        @failed="actionError = $event"
      />
      <TeacherAssignmentsPanel v-if="mode === 'teachers'" :data="assignments" @changed="handleAssignmentChanged" />
      </template
    >
    <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="academic-structure" :mode="mode" :columns="mode === 'teachers' ? 6 : 5" />
    <ManagedUserSheet
      v-if="mode === 'teachers'"
      v-model:open="teacherOpen"
      :teacher-career="assignments?.career ?? null"
      :show-trigger="false"
      @saved="handleAssignmentChanged"
    />
  </PageFrame>
</template>
