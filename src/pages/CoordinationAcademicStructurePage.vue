<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { ChevronDown, Link2, ListTree, Plus, UserPlus, Workflow } from "@lucide/vue";
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
import ManagedUserSheet from "@/components/domain/identity/ManagedUserSheet.vue";
import CurriculumActions from "@/components/domain/academic/CurriculumActions.vue";
import CurriculumCanvas from "@/components/domain/academic/curriculum/CurriculumCanvas.vue";
import CurriculumConfigurationSheet from "@/components/domain/academic/curriculum/CurriculumConfigurationSheet.vue";
import CurriculumFormView from "@/components/domain/academic/curriculum/CurriculumFormView.vue";
import CurriculumRequirementSheet from "@/components/domain/academic/curriculum/CurriculumRequirementSheet.vue";
import CurriculumSubjectSheet from "@/components/domain/academic/curriculum/CurriculumSubjectSheet.vue";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    curriculum: `${curriculum.value?.curriculum.code ?? 'Malla curricular'} · ${career}. Edite el desglose académico o trabaje sobre la misma información en el modo interactivo.`,
    schedule: `Planifique qué materias se dictan cada período en ${career} y organice sus paralelos.`,
    teachers: `Quién dicta cada paralelo en ${career}.`,
  }[props.mode];
});
const curriculum = ref<Curriculum | null>(null);
const schedule = ref<ScheduledSubjects | null>(null);
const assignments = ref<TeacherAssignments | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const teacherOpen = ref(false);
const assignmentOpen = ref(false);
const activeMode = ref<'breakdown' | 'builder'>(new URL(window.location.href).searchParams.get('modo') === 'desglose' ? 'breakdown' : 'builder');
const subjectOpen = ref(false);
const requirementOpen = ref(false);
const configurationOpen = ref(false);
const selectedSubject = ref<Curriculum['subjects'][number] | null>(null);
const organizationUnits = computed(() => Array.from(new Set((curriculum.value?.subjects ?? []).map((item) => item.organization_unit?.trim()).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b, 'es')));
watch(activeMode, (mode) => {
  const url = new URL(window.location.href);
  if (mode === 'breakdown') url.searchParams.set('modo', 'desglose'); else url.searchParams.delete('modo');
  window.history.replaceState(window.history.state, '', url);
});
const openNewSubject = () => { selectedSubject.value = null; subjectOpen.value = true; };
const openSubject = (subject: Curriculum['subjects'][number]) => { selectedSubject.value = subject; subjectOpen.value = true; };
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
  } catch (reason) {
    error.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo cargar la estructura académica.";
  }
};
const reloadSchedule = async (periodId?: string) => {
  try {
    error.value = null;
    schedule.value = await getScheduledSubjects(periodId);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo actualizar la programación académica.";
  }
};
const handleScheduleChanged = async (notice: string) => {
  message.value = notice;
  await reloadSchedule(schedule.value?.selectedPeriodId ?? undefined);
};
const reloadAssignments = async () => {
  try {
    error.value = null;
    assignments.value = await getTeacherAssignments();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudieron actualizar las asignaciones docentes.";
  }
};
const handleAssignmentChanged = async (notice: string) => {
  message.value = notice;
  await reloadAssignments();
};
const reloadCurriculum = async () => {
  try {
    const careerId = curriculum.value?.career.id;
    if (!careerId) return;
    error.value = null;
    curriculum.value = await getCurriculum(careerId);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : "No se pudo actualizar la malla.";
  }
};
const handleCurriculumChanged = async (notice: string) => {
  message.value = notice;
  await reloadCurriculum();
};
onMounted(() => {
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
        v-if="mode === 'schedule' && schedule && !schedule.career.lock_reason && schedule.options.periods.some((item) => item.planning_enabled)"
        :scheduled-subjects="schedule.scheduledSubjects"
        :options="schedule.options"
        :initial-period-id="schedule.selectedPeriodId"
        @saved="handleScheduleChanged"
      />
      <DropdownMenu v-if="mode === 'teachers' && assignments && (assignments.canCreateTeacher || !assignments.career.lock_reason)">
        <DropdownMenuTrigger as-child><Button><UserPlus data-icon="inline-start" aria-hidden="true" />Gestionar docente<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuGroup>
          <DropdownMenuItem v-if="assignments.canCreateTeacher" @select="teacherOpen = true">Crear docente</DropdownMenuItem>
          <DropdownMenuItem v-if="!assignments.career.lock_reason" @select="assignmentOpen = true">Asignar docente</DropdownMenuItem>
        </DropdownMenuGroup></DropdownMenuContent>
      </DropdownMenu>
      <TeacherAssignmentSheet
        v-if="mode === 'teachers' && assignments && !assignments.career.lock_reason"
        v-model:open="assignmentOpen"
        :options="assignments.options"
        :show-trigger="false"
        @saved="handleAssignmentChanged"
      />
    </template>
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <template v-if="curriculum && schedule && assignments"
      >
      <template v-if="mode === 'curriculum'">
        <ProcessLockAlert v-if="curriculum.curriculum.lock_reason" title="Malla protegida durante la convocatoria" :reason="curriculum.curriculum.lock_reason" />
        <Tabs v-model="activeMode" class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <TabsList aria-label="Modo de trabajo de la malla"><TabsTrigger value="builder"><Workflow aria-hidden="true" />Interactivo</TabsTrigger><TabsTrigger value="breakdown"><ListTree aria-hidden="true" />Desglose académico</TabsTrigger></TabsList>
            <CurriculumActions :curriculum="curriculum.curriculum" @configure="configurationOpen = true" />
          </div>
          <div v-if="activeMode === 'breakdown'" class="flex flex-wrap justify-end gap-2">
            <Button v-if="curriculum.curriculum.editable && curriculum.subjects.length > 1" type="button" variant="outline" @click="requirementOpen = true"><Link2 data-icon="inline-start" aria-hidden="true" />Agregar relación</Button>
            <Button v-if="curriculum.curriculum.editable" type="button" @click="openNewSubject"><Plus data-icon="inline-start" aria-hidden="true" />Agregar materia</Button>
          </div>
          <TabsContent value="breakdown" class="flex flex-col gap-6"><CurriculumFormView :data="curriculum" @edit="openSubject" @changed="handleCurriculumChanged" @failed="error = $event" /></TabsContent>
          <TabsContent value="builder"><CurriculumCanvas :career="curriculum.career" :modality-options="curriculum.modalityOptions" :curriculum="curriculum.curriculum" :fixed-fields="curriculum.fixedFields" :fixed-field-totals="curriculum.fixedFieldTotals" :subjects="curriculum.subjects" :requirements="curriculum.requirements" :organization-units="organizationUnits" @changed="handleCurriculumChanged" /></TabsContent>
        </Tabs>
        <CurriculumSubjectSheet v-model:open="subjectOpen" :career="curriculum.career" :curriculum="curriculum.curriculum" :fixed-fields="curriculum.fixedFields" :subject="selectedSubject" :organization-units="organizationUnits" :modality-options="curriculum.modalityOptions" @saved="handleCurriculumChanged" />
        <CurriculumRequirementSheet v-model:open="requirementOpen" :curriculum="curriculum.curriculum" :subjects="curriculum.subjects" @saved="handleCurriculumChanged" />
        <CurriculumConfigurationSheet v-model:open="configurationOpen" :curriculum="curriculum.curriculum" @saved="handleCurriculumChanged" />
      </template>
      <Alert v-if="mode === 'schedule' && schedule.career.lock_reason">
        <AlertDescription>{{ schedule.career.lock_reason }}</AlertDescription>
      </Alert>
      <ScheduledSubjectsTab
        v-if="mode === 'schedule'"
        :data="schedule"
        @period="reloadSchedule"
        @changed="handleScheduleChanged"
        @failed="error = $event"
      />
      <Alert v-if="mode === 'teachers' && assignments.career.lock_reason"><AlertDescription>{{ assignments.career.lock_reason }}</AlertDescription></Alert>
      <TeacherAssignmentsPanel v-if="mode === 'teachers'" :data="assignments" @changed="handleAssignmentChanged" />
      </template
    >
    <p v-else-if="!error">Cargando estructura académica…</p>
    <ManagedUserSheet
      v-if="mode === 'teachers'"
      v-model:open="teacherOpen"
      :teacher-career="assignments?.career ?? null"
      :show-trigger="false"
      @saved="handleAssignmentChanged"
    />
  </PageFrame>
</template>
