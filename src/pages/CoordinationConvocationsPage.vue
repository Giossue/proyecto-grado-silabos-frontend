<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getConvocations, type ConvocationItem } from '@/api/convocations';
import { getSession } from '@/api/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';
import ConvocationTrackingDialog from '@/components/domain/syllabus/ConvocationTrackingDialog.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const data = ref<ConvocationItem[] | null>(null);
const current = computed(() => data.value?.find((item) => item.state !== 'cerrada') ?? data.value?.[0] ?? null);
const loading = ref(true);
const error = ref<string | null>(null);
const trackingId = ref<string | null>(null);
const trackingOpen = ref(false);
const openTracking = (id: string | null): void => {
  if (!id) return;
  trackingId.value = id;
  trackingOpen.value = true;
};
const stateLabel = (value: string): string => ({ sin_iniciar: 'Sin iniciar', preparacion: 'En preparación', abierto: 'Abierta', abierta: 'Abierta', pausado: 'Pausada', pausada: 'Pausada', cerrado: 'Finalizada', cerrada: 'Finalizada' })[value] ?? 'Estado no disponible';
const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = (await getConvocations()).convocations.data;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las convocatorias.';
  } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => {
  toast.success(notice);
  await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Convocatorias de sílabos" description="Inicie, pause o reanude la convocatoria de su carrera cuando su configuración académica esté lista.">
    <LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="1" />
    <Card v-if="data"><CardContent class="flex flex-col items-start gap-4">
      <p v-if="!current" class="text-sm text-muted-foreground">Aún no hay convocatorias para su carrera.</p>
      <template v-else>
        <div class="flex flex-col gap-1"><h2 class="text-lg font-semibold">{{ current.name }}</h2><p class="text-sm text-muted-foreground">Estado en su carrera: {{ stateLabel(current.state) }}</p></div>
        <div class="flex flex-wrap items-center gap-3"><ConvocationActions :convocation="current" @changed="changed" /><Button v-if="current.id" type="button" variant="outline" size="lg" @click="openTracking(current.id)">Ver seguimiento</Button></div>
      </template>
    </CardContent></Card>
    <ConvocationTrackingDialog v-if="trackingId" v-model:open="trackingOpen" :convocation-id="trackingId" />
  </PageFrame>
</template>
