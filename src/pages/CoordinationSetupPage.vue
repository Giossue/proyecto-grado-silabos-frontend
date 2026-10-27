<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import ConvocationOpeningDialog from '@/components/domain/syllabus/ConvocationOpeningDialog.vue';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);
const openingOpen = ref(false);

const stepRoutes: Record<string, string> = {
  curriculum: paths.coordination.curriculum,
  scheduled_subjects: paths.coordination.scheduledSubjects,
  parallels: paths.coordination.scheduledSubjects,
  teachers: paths.coordination.teachers,
  convocation: paths.coordination.reviews,
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({ ...step, href: stepRoutes[step.key] ?? paths.coordination.reviews })),
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

const handleAction = (action: string): void => {
  if (action === 'open_convocation' && dashboard.value?.coordination_convocation?.can_open) openingOpen.value = true;
};

const opened = async (message: string): Promise<void> => {
  toast.success(message);
  await router.push(paths.coordination.reviews);
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Puesta en marcha" description="Los pasos para preparar su carrera y abrir la convocatoria." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <SetupChecklist v-else-if="setup" :setup="setup" keep-when-done @action="handleAction" />
    <LoadingSkeleton v-else variant="setup" />
  </PageFrame>
  <ConvocationOpeningDialog
    v-if="dashboard?.coordination_convocation"
    v-model:open="openingOpen"
    :process-id="dashboard.coordination_convocation.process_id"
    :period="dashboard.coordination_convocation.period"
    @opened="opened"
  />
</template>
