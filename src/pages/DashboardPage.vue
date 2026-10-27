<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { sessionState } from '@/state/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import MetricTiles from '@/components/domain/MetricTiles.vue';
import { paths } from '@/lib/routes';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);

const setupRoutes: Record<string, string> = {
  faculties: paths.admin.academic,
  careers: paths.admin.academicWithSection('carrera'),
  accounts: paths.admin.users,
  coordinators: paths.admin.academicWithSection('carrera'),
  template: paths.admin.template,
  process: paths.admin.convocations,
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({
    ...step,
    href: setupRoutes[step.key] ?? paths.dashboard,
  })),
} : null);

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
      <SetupChecklist v-if="setup" :setup="setup" />
    </template>
    <LoadingSkeleton v-else variant="dashboard" />
  </PageFrame>
</template>
