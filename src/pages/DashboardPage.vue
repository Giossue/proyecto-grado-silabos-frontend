<script setup lang="ts">
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
import MetricTiles from '@/components/domain/MetricTiles.vue';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';
import ConvocationTrackingDialog from '@/components/domain/syllabus/ConvocationTrackingDialog.vue';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);
const openingOpen = ref(false);
const trackingOpen = ref(false);

const setupRoutes: Record<string, string> = {
  faculties: paths.admin.academic,
  careers: paths.admin.academicWithSection('carrera'),
  accounts: paths.admin.users,
  coordinators: paths.admin.academicWithSection('carrera'),
  template: paths.admin.template,
  process: paths.admin.convocations,
  curriculum: paths.coordination.curriculum,
  scheduled_subjects: paths.coordination.scheduledSubjects,
  parallels: paths.coordination.scheduledSubjects,
  teachers: paths.coordination.teachers,
  convocation: paths.coordination.panel,
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({
    ...step,
    href: setupRoutes[step.key] ?? paths.dashboard,
  })),
} : null);
const roleCode = computed(() => sessionState.current.value?.active_role?.code ?? null);
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
  <PageFrame class="h-full flex-1" size="wide" title="Panel de trabajo" description="">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <template v-else-if="dashboard">
      <MetricTiles v-if="dashboard.metrics.length > 0" :metrics="dashboard.metrics" />
      <p v-else class="text-sm text-muted-foreground">No hay indicadores disponibles para este rol.</p>
      <ConvocationDeadlineCard v-if="dashboard.deadline && roleCode === 'coordinador'" :deadline="dashboard.deadline" audience="coordinador" @tracking="trackingOpen = true"><template v-if="dashboard.coordination_convocation" #actions><ConvocationActions :convocation="dashboard.coordination_convocation" @changed="handleOpened" /></template></ConvocationDeadlineCard>
      <SetupChecklist v-if="setup" :setup="setup" @action="handleSetupAction" />
    </template>
    <LoadingSkeleton v-else variant="dashboard" :dashboard-role="roleCode ?? undefined" />
  </PageFrame>
  <ConvocationOpeningDialog
    v-if="dashboard?.coordination_convocation"
    v-model:open="openingOpen"
    :process-id="dashboard.coordination_convocation.process_id"
    :period="dashboard.coordination_convocation.period"
    @opened="handleOpened"
  />
  <ConvocationTrackingDialog v-if="trackingId" v-model:open="trackingOpen" :convocation-id="trackingId" />
</template>
