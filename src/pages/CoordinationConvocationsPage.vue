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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paths } from '@/lib/routes';

const router = useRouter();
const data = ref<ConvocationsPage | null>(null);
const loading = ref(true);
const filters = reactive({ q: '', state: 'all' });
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const stateLabel = (value: string): string => ({ sin_iniciar: 'Sin iniciar', preparacion: 'En preparación', abierto: 'Abierta', abierta: 'Abierta', pausado: 'En pausa', pausada: 'En pausa', cerrado: 'Cerrada', cerrada: 'Cerrada' })[value] ?? 'Estado no disponible';
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
const changed = async (value: string): Promise<void> => {
  message.value = value;
  await load();
};
const navigate = async (id: string): Promise<void> => {
  await router.push(paths.coordination.convocation(id));
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Convocatorias de sílabos" description="Inicie la convocatoria de su carrera desde Acciones cuando su configuración académica esté lista.">
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert><LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="loading && !data" />
    <Card v-if="data"><CardContent class="flex flex-col gap-4">
      <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters"><template #search><Field><FieldLabel for="convocations-search" class="sr-only">Buscar convocatoria</FieldLabel><Input id="convocations-search" v-model="filters.q" type="search" placeholder="Buscar por nombre o periodo" /></Field></template><template #filters><Field><FieldLabel for="convocations-state" class="sr-only">Estado</FieldLabel><Select v-model="filters.state"><SelectTrigger id="convocations-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="preparacion">En preparación</SelectItem><SelectItem value="sin_iniciar">Sin iniciar</SelectItem><SelectItem value="abierta">Abiertas</SelectItem><SelectItem value="pausada">En pausa</SelectItem><SelectItem value="cerrada">Cerradas</SelectItem></SelectGroup></SelectContent></Select></Field></template></FilterToolbar></form>
      <Table><TableHeader><TableRow><TableHead>Convocatoria</TableHead><TableHead>Periodo</TableHead><TableHead>Estado institucional</TableHead><TableHead>Estado de la carrera</TableHead><TableHead class="text-right">Expedientes</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
        <TableEmpty v-if="data.convocations.data.length === 0" :colspan="6">No hay convocatorias para los filtros actuales.</TableEmpty>
        <TableRow v-for="convocation in data.convocations.data" v-else :key="convocation.process_id"><TableCell>{{ convocation.name }}</TableCell><TableCell>{{ convocation.period }}</TableCell><TableCell>{{ stateLabel(convocation.process_state) }}</TableCell><TableCell>{{ stateLabel(convocation.state) }}</TableCell><TableCell class="text-right">{{ convocation.syllabi_count }}</TableCell><TableCell class="text-right"><ConvocationActions :convocation="convocation" :available-sources="data.available_sources" @changed="changed" @navigate="navigate" /></TableCell></TableRow>
      </TableBody></Table>
      <TablePagination :meta="data.convocations" label="Paginación de convocatorias" @update:page="load" />
    </CardContent></Card>
  </PageFrame>
</template>
