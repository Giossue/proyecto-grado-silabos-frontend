<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import { paths } from '@/lib/routes';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);

const stepRoutes: Record<string, string> = {
  faculties: paths.admin.academic,
  careers: paths.admin.academicWithSection('carrera'),
  accounts: paths.admin.users,
  coordinators: paths.admin.academicWithSection('carrera'),
  template: paths.admin.template,
  process: paths.admin.convocations,
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({ ...step, href: stepRoutes[step.key] ?? paths.admin.convocations })),
} : null);

const load = async (): Promise<void> => {
  error.value = null;
  try {
    dashboard.value = await getDashboard();
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la puesta en marcha.';
  }
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Puesta en marcha" description="Los pasos para preparar el sistema y abrir la convocatoria." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <SetupChecklist v-else-if="setup" :setup="setup" keep-when-done />
    <LoadingSkeleton v-else variant="setup" />
  </PageFrame>
</template>
