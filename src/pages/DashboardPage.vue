<script setup lang="ts">
import { BookOpenCheck, Building2, CalendarRange, CircleAlert, ClipboardCheck, FileStack, PencilLine, UsersRound } from '@lucide/vue';
import type { Component } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { sessionState } from '@/state/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ConvocationDeadlineCard from '@/components/domain/ConvocationDeadlineCard.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import StatTile from '@/components/domain/StatTile.vue';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';
import ConvocationTrackingSheet from '@/components/domain/syllabus/ConvocationTrackingSheet.vue';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);
const openingOpen = ref(false);
const trackingOpen = ref(false);

const icons: Record<string, Component> = { progress: BookOpenCheck, days_left: CalendarRange, careers_without_convocation: Building2, not_started: PencilLine, in_review: ClipboardCheck, pending: FileStack, correction_requested: CircleAlert, teachers_pending: UsersRound };
const setupRoutes: Record<string, string> = {
  faculties: paths.admin.academic,
  careers: paths.admin.academic,
  coordinators: paths.admin.users,
  template: paths.admin.template,
  process: paths.admin.convocations,
  curriculum: paths.coordination.curriculum,
  scheduled_subjects: paths.coordination.scheduledSubjects,
  parallels: paths.coordination.scheduledSubjects,
  teachers: paths.coordination.teacherAssignments,
  sources: paths.coordination.sources,
  convocation: paths.coordination.convocations,
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({
    ...step,
    href: setupRoutes[step.key] ?? paths.dashboard,
  })),
} : null);
const roleCode = computed(() => sessionState.current.value?.active_role?.code ?? null);
const deadlineRole = computed(() => roleCode.value === 'coordinador' || roleCode.value === 'docente' ? roleCode.value : null);
const trackingId = computed(() => dashboard.value?.coordination_convocation?.convocation_id ?? dashboard.value?.deadline?.convocation_id ?? null);

const handleSetupAction = (action: string): void => {
  if (action === 'open_convocation' && dashboard.value?.coordination_convocation?.can_open) {
    openingOpen.value = true;
  }
};

const handleOpened = async (message: string): Promise<void> => {
  toast.success(message);
  await load();
};

const load = async (): Promise<void> => {
  error.value = null;
  try {
    const session = await sessionState.load();
    if (!session?.active_role) { await router.replace(paths.root); return; }
    dashboard.value = await getDashboard();
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el panel de trabajo.';
  }
};

onMounted(() => { void load(); });
</script>
<template>
  <PageFrame class="h-full flex-1" title="Panel de trabajo" description="">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <template v-else-if="dashboard">
      <div v-if="dashboard.metrics.length > 0" class="grid grid-cols-2 gap-4 xl:grid-cols-4 [&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatTile v-for="metric in dashboard.metrics" :key="metric.key" :label="metric.label" :value="metric.value" :suffix="metric.suffix ?? undefined" :hint="metric.hint" :icon="icons[metric.key]" />
      </div>
      <p v-else class="text-sm text-muted-foreground">No hay indicadores disponibles para este rol.</p>
      <ConvocationDeadlineCard v-if="dashboard.deadline && deadlineRole" :deadline="dashboard.deadline" :role="deadlineRole" @tracking="trackingOpen = true" />
      <SetupChecklist v-if="setup" :setup="setup" @action="handleSetupAction" />
    </template>
    <LoadingSkeleton v-else variant="dashboard" />
  </PageFrame>
  <ConvocationOpeningDialog
    v-if="dashboard?.coordination_convocation"
    v-model:open="openingOpen"
    :process-id="dashboard.coordination_convocation.process_id"
    :period="dashboard.coordination_convocation.period"
    :available-sources="dashboard.coordination_convocation.available_sources"
    @opened="handleOpened"
  />
  <ConvocationTrackingSheet v-if="trackingId" v-model:open="trackingOpen" :convocation-id="trackingId" />
</template>
