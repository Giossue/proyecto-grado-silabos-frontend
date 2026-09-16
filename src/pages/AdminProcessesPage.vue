<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import {
  createProcess,
  extendProcessDeadline,
  getProcesses,
  updateProcess,
  type ProcessPayload,
  type Processes,
  type SyllabusProcess,
} from '@/api/processes';
import { getSession } from '@/api/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import SyllabusProcessActions from '@/components/domain/syllabus/SyllabusProcessActions.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';

const router = useRouter();
const data = ref<Processes | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const selectedProcess = ref<SyllabusProcess | null>(null);
const mode = ref<'create' | 'edit' | 'deadline' | null>(null);
const processing = ref(false);
const form = reactive<ProcessPayload>({ period_id: '', starts_at: '', due_at: '' });
const deadline = reactive({ stage: 'entrega', due_at: '', reason: '' });

const processes = computed(() => data.value?.processes ?? []);
const filter = useClientFilter(
  processes,
  (item) => [item.name, item.period_name, item.template],
  { estado: { matches: (item, value) => item.state === value } },
);
const { items: processPage, meta: processMeta, setPage: setProcessPage } = useClientPagination(() => filter.items.value);

const asDate = (value: string) => value.slice(0, 10);
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value));
const stateLabel = (state: SyllabusProcess['state']) => ({
  preparacion: 'En preparación', abierto: 'Abierto', pausado: 'Pausado', cerrado: 'Cerrado',
}[state]);

const modalTitle = computed(() => mode.value === 'create' ? 'Preparar proceso institucional'
  : mode.value === 'edit' ? `Editar ${selectedProcess.value?.name ?? 'proceso'}`
    : 'Prorrogar plazo institucional');
const sheetOpen = computed({ get: () => mode.value !== null, set: (open: boolean) => { if (!open) mode.value = null; } });

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') {
      await router.replace('/panel');
      return;
    }
    data.value = await getProcesses();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los procesos institucionales.';
  } finally {
    loading.value = false;
  }
};

const openCreate = (): void => {
  form.period_id = '';
  form.starts_at = '';
  form.due_at = '';
  selectedProcess.value = null;
  mode.value = 'create';
};

const openEdit = (process: SyllabusProcess): void => {
  selectedProcess.value = process;
  form.period_id = process.period_id;
  form.starts_at = asDate(process.starts_at);
  form.due_at = asDate(process.due_at);
  mode.value = 'edit';
};

const openDeadline = (process: SyllabusProcess): void => {
  selectedProcess.value = process;
  deadline.stage = 'entrega';
  deadline.due_at = asDate(process.due_at);
  deadline.reason = '';
  mode.value = 'deadline';
};

const save = async (): Promise<void> => {
  try {
    processing.value = true;
    error.value = null;
    message.value = mode.value === 'create'
      ? (await createProcess({ ...form })).message
      : (await updateProcess(selectedProcess.value!.id, { ...form })).message;
    mode.value = null;
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo guardar el proceso.';
  } finally {
    processing.value = false;
  }
};

const saveDeadline = async (): Promise<void> => {
  if (!selectedProcess.value) return;
  try {
    processing.value = true;
    error.value = null;
    message.value = await extendProcessDeadline(selectedProcess.value.id, { ...deadline }).then((response) => response.message);
    mode.value = null;
    await load();
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo prorrogar el plazo.';
  } finally {
    processing.value = false;
  }
};

const transitionCompleted = async (status: string): Promise<void> => {
  message.value = status;
  await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame
    title="Convocatorias de sílabos"
    description="El proceso institucional que obliga a todas las carreras: con qué plantilla se elaboran los sílabos y entre qué fechas. Cada coordinación convoca a su carrera dentro de él."
  >
    <template #actions>
      <Button v-if="data && data.active_process === null" type="button" @click="openCreate">Preparar proceso</Button>
    </template>

    <Alert v-if="data?.active_process">
      <AlertTitle>No se puede preparar otro proceso</AlertTitle>
      <AlertDescription>
        El proceso «{{ data.active_process.name }}» del período {{ data.active_process.period }} está
        {{ data.active_process.state === 'abierto' ? 'abierto' : 'en pausa' }}. Ciérrelo antes de crear otro.
      </AlertDescription>
    </Alert>
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <p v-if="loading && !data" class="text-sm text-muted-foreground" role="status">Cargando procesos…</p>

    <Card v-if="data">
      <CardContent class="flex flex-col gap-4">
        <ClientFilterBar
          :filter="filter"
          input-id="processes-search"
          label="Buscar proceso"
          placeholder="Buscar por nombre o plantilla"
        >
          <template #filters>
            <Field>
              <FieldLabel for="processes-search-state" class="sr-only">Estado</FieldLabel>
              <Select v-model="filter.values.estado.value">
                <SelectTrigger id="processes-search-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="preparacion">En preparación</SelectItem>
                  <SelectItem value="abierto">Abiertos</SelectItem>
                  <SelectItem value="pausado">En pausa</SelectItem>
                  <SelectItem value="cerrado">Cerrados</SelectItem>
                </SelectGroup></SelectContent>
              </Select>
            </Field>
          </template>
        </ClientFilterBar>

        <Table data-cards="true">
          <TableHeader><TableRow>
            <TableHead>Proceso</TableHead><TableHead>Estado</TableHead><TableHead>Periodo</TableHead>
            <TableHead>Plantilla</TableHead><TableHead>Inicio</TableHead><TableHead>Entrega</TableHead>
            <TableHead class="text-right">Convocatorias</TableHead><TableHead class="text-right">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            <TableEmpty v-if="processPage.length === 0" :colspan="8">
              {{ filter.active.value ? 'Ningún proceso coincide con la búsqueda.' : 'No hay procesos de sílabos. Prepare el primero con la plantilla y las fechas del calendario institucional.' }}
            </TableEmpty>
            <TableRow v-for="process in processPage" v-else :key="process.id">
              <TableCell>{{ process.name }}</TableCell>
              <TableCell>{{ stateLabel(process.state) }}</TableCell>
              <TableCell>{{ process.period_name }}</TableCell>
              <TableCell>{{ process.template }}</TableCell>
              <TableCell>{{ formatDate(process.starts_at) }}</TableCell>
              <TableCell>{{ formatDate(process.due_at) }}</TableCell>
              <TableCell class="text-right">{{ process.convocations_count }}</TableCell>
              <TableCell class="text-right">
                <SyllabusProcessActions
                  :process="process"
                  @edit="openEdit"
                  @deadline="openDeadline"
                  @completed="transitionCompleted"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <TablePagination :meta="processMeta" label="Paginación de procesos de sílabos" @update:page="setProcessPage" />
      </CardContent>
    </Card>

    <FormSheet v-model:open="sheetOpen" :show-trigger="false" trigger-label="Preparar proceso" :title="modalTitle" description="Configure el período y las fechas institucionales.">
      <template #default="{ close }">
        <form v-if="mode !== 'deadline'" class="space-y-5" @submit.prevent="save">
          <Field><FieldLabel for="process-period" required>Período académico</FieldLabel><Select v-model="form.period_id" :disabled="mode === 'edit' && !selectedProcess?.configurable"><SelectTrigger id="process-period"><SelectValue placeholder="Seleccione un período" /></SelectTrigger><SelectContent><SelectItem v-for="period in data?.periods" :key="period.id" :value="period.id">{{ period.codigo }}</SelectItem></SelectContent></Select></Field>
          <Field><FieldLabel for="process-start" required>Inicio</FieldLabel><Input id="process-start" v-model="form.starts_at" type="date" required /></Field>
          <Field><FieldLabel for="process-due" required>Fecha límite de entrega</FieldLabel><Input id="process-due" v-model="form.due_at" type="date" required /></Field>
          <FormSheetActions label="Guardar proceso" :close="close" :processing="processing" />
        </form>
        <form v-else class="space-y-5" @submit.prevent="saveDeadline">
          <Field><FieldLabel for="deadline-stage" required>Etapa</FieldLabel><Select v-model="deadline.stage"><SelectTrigger id="deadline-stage"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="inicio">Inicio</SelectItem><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="entrega">Entrega</SelectItem></SelectContent></Select></Field>
          <Field><FieldLabel for="deadline-date" required>Nueva fecha límite</FieldLabel><Input id="deadline-date" v-model="deadline.due_at" type="date" required /></Field>
          <Field><FieldLabel for="deadline-reason" required>Motivo de la prórroga</FieldLabel><Textarea id="deadline-reason" v-model="deadline.reason" required minlength="10" maxlength="500" /></Field>
          <FormSheetActions label="Guardar prórroga" :close="close" :processing="processing" />
        </form>
      </template>
    </FormSheet>
  </PageFrame>
</template>
