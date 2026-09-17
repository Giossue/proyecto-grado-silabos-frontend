<script setup lang="ts">
import { BookOpenCheck, Building2, CalendarRange, CircleAlert, ClipboardCheck, FileStack, ListRestart, PencilLine, UsersRound } from '@lucide/vue';
import type { Component } from 'vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { sessionState } from '@/state/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import FacultyLogoDialog from '@/components/domain/configuration/FacultyLogoDialog.vue';
import SetupChecklist from '@/components/domain/SetupChecklist.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StatTile from '@/components/domain/StatTile.vue';

const router = useRouter();
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const facultyLogoOpen = ref(false);
const role = computed(() => sessionState.current.value?.active_role);
const icons: Record<string, Component> = { progress: BookOpenCheck, days_left: CalendarRange, careers_without_convocation: Building2, not_started: PencilLine, in_review: ClipboardCheck, pending: FileStack, completion: ListRestart, correction_requested: CircleAlert, teachers_pending: UsersRound };
const setupRoutes: Record<string, string> = {
  faculties: '/admin/estructura-academica',
  campuses: '/admin/estructura-academica',
  careers: '/admin/estructura-academica',
  coordinators: '/admin/usuarios',
  template: '/admin/plantilla',
  process: '/admin/convocatorias',
  curriculum: '/coordinacion/malla',
  scheduled_subjects: '/coordinacion/materias-paralelos',
  parallels: '/coordinacion/materias-paralelos',
  teachers: '/coordinacion/asignaciones-docentes',
  sources: '/coordinacion/fuentes',
  convocation: '/coordinacion/convocatorias',
};
const setup = computed(() => dashboard.value?.setup ? {
  ...dashboard.value.setup,
  steps: dashboard.value.setup.steps.map((step) => ({
    ...step,
    href: setupRoutes[step.key] ?? '/dashboard',
  })),
} : null);
const handleSetupAction = (action: string) => {
  if (action === 'faculty_logo') facultyLogoOpen.value = true;
};
const handleLogoSaved = async (notice: string) => {
  message.value = notice;
  dashboard.value = await getDashboard();
};

onMounted(async () => {
  try {
    const session = await sessionState.load();
    if (!session?.active_role || session.user.must_change_password) { await router.replace('/'); return; }
    dashboard.value = await getDashboard();
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace('/login'); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el panel de trabajo.';
  }
});
</script>
<template>
  <PageFrame class="h-full flex-1" title="Panel de trabajo" :description="role?.career_name ?? 'Gestión institucional de Sílabos UEB'">
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <template v-else-if="dashboard">
      <SetupChecklist v-if="setup" :setup="setup" @action="handleSetupAction" />
      <div v-if="dashboard.metrics.length > 0" class="grid grid-cols-2 gap-4 xl:grid-cols-4 [&>*:last-child:nth-child(odd)]:col-span-2 xl:[&>*:last-child:nth-child(odd)]:col-span-1">
        <StatTile v-for="metric in dashboard.metrics" :key="metric.key" :label="metric.label" :value="metric.value" :suffix="metric.suffix ?? undefined" :hint="metric.hint" :icon="icons[metric.key]" />
      </div>
      <p v-else class="text-sm text-muted-foreground">No hay indicadores disponibles para este rol.</p>
    </template>
    <LoadingSkeleton v-else variant="dashboard" />
  </PageFrame>
  <FacultyLogoDialog
    v-if="dashboard?.faculty_logo"
    v-model:open="facultyLogoOpen"
    :faculty-name="dashboard.faculty_logo.name"
    :current-url="dashboard.faculty_logo.current_url"
    :configured="dashboard.faculty_logo.configured"
    :size="dashboard.faculty_logo.size"
    @saved="handleLogoSaved"
  />
</template>
