<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getConvocations, type ConvocationsPage } from '@/api/convocations';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';
import ConvocationTrackingDialog from '@/components/domain/syllabus/ConvocationTrackingDialog.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const data = ref<ConvocationsPage | null>(null);
const loading = ref(true);
const filters = reactive({ q: '', state: 'all' });
const error = ref<string | null>(null);
const trackingId = ref<string | null>(null);
const trackingOpen = ref(false);
const openTracking = (id: string | null): void => {
  if (!id) return;
  trackingId.value = id;
  trackingOpen.value = true;
};
const stateLabel = (value: string): string => ({ sin_iniciar: 'Sin iniciar', preparacion: 'En preparación', abierto: 'Abierta', abierta: 'Abierta', pausado: 'Pausada', pausada: 'Pausada', cerrado: 'Finalizada', cerrada: 'Finalizada' })[value] ?? 'Estado no disponible';
const load = async (page = 1): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = await getConvocations({ q: filters.q, state: filters.state === 'all' ? '' : filters.state, page });
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las convocatorias.';
  } finally { loading.value = false; }
};
const clearFilters = (): void => {
  Object.assign(filters, { q: '', state: 'all' });
  void load();
};
const changed = async (notice: string): Promise<void> => {
  toast.success(notice);
  await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Convocatorias de sílabos" description="Inicie la convocatoria de su carrera desde Acciones cuando su configuración académica esté lista.">
    <LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="1" />
    <Card v-if="data"><CardContent class="flex flex-col gap-4">
      <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters"><template #search><Field><FieldLabel for="convocations-search" class="sr-only">Buscar convocatoria</FieldLabel><Input id="convocations-search" v-model="filters.q" type="search" placeholder="Buscar por nombre o periodo" /></Field></template><template #filters><Field><FieldLabel for="convocations-state" class="sr-only">Estado</FieldLabel><Select v-model="filters.state" name="state"><SelectTrigger id="convocations-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="abierta">Iniciadas</SelectItem><SelectItem value="pausada">Pausadas</SelectItem><SelectItem value="cerrada">Finalizadas</SelectItem></SelectGroup></SelectContent></Select></Field></template></FilterToolbar></form>
      <Table><TableHeader><TableRow><TableHead>Convocatoria</TableHead><TableHead>Estado institucional</TableHead><TableHead>Estado de la carrera</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
        <TableEmpty v-if="data.convocations.data.length === 0" :colspan="4">No hay convocatorias para los filtros actuales.</TableEmpty>
        <TableRow v-for="convocation in data.convocations.data" v-else :key="convocation.process_id" :class="convocation.id ? 'cursor-pointer' : ''" :role="convocation.id ? 'button' : undefined" :tabindex="convocation.id ? 0 : undefined" :aria-label="convocation.id ? `Ver seguimiento de ${convocation.name}` : undefined" @click="openTracking(convocation.id)" @keydown.enter.prevent="openTracking(convocation.id)"><TableCell>{{ convocation.name }}</TableCell><TableCell>{{ stateLabel(convocation.process_state) }}</TableCell><TableCell>{{ stateLabel(convocation.state) }}</TableCell><TableCell class="text-right" @click.stop @keydown.enter.stop><ConvocationActions :convocation="convocation" @changed="changed" /></TableCell></TableRow>
      </TableBody></Table>
      <TablePagination :meta="data.convocations" label="Paginación de convocatorias" @update:page="load" />
    </CardContent></Card>
    <ConvocationTrackingDialog v-if="trackingId" v-model:open="trackingOpen" :convocation-id="trackingId" />
  </PageFrame>
</template>
