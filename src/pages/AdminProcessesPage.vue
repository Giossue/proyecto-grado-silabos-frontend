<script lang="ts">
import type { SyllabusProcess } from '@/api/processes';
import type { AcademicStructureProps } from '@/types/academic';

type PeriodRecord = AcademicStructureProps['catalogs']['periods'][number];
export type ConvocationRow = PeriodRecord & { process: SyllabusProcess | null };
</script>

<script setup lang="ts">
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue';
import { useRouter } from 'vue-router';
import { getAcademicGovernance, type AcademicGovernance } from '@/api/academic';
import { getProcesses, type Processes } from '@/api/processes';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import ConvocationPeriodSheet from '@/components/domain/syllabus/ConvocationPeriodSheet.vue';
import ConvocationOptionsDialog from '@/components/domain/syllabus/ConvocationOptionsDialog.vue';
import ConvocationRowActions from '@/components/domain/syllabus/ConvocationRowActions.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { activateRow } from '@/lib/rowActivation';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const governance = ref<AcademicGovernance | null>(null);
const processData = ref<Processes | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const selected = ref<ConvocationRow | null>(null);
const sheetOpen = ref(false);
const rowActions = useTemplateRef('rowActions');
const select = (row: ConvocationRow): void => { selected.value = row; sheetOpen.value = true; };
const runAction = async (key: string): Promise<void> => { await nextTick(); rowActions.value?.run(key); };
const current = computed(() => rows.value.find((row) => row.id === selected.value?.id) ?? null);
const loaded = computed(() => governance.value !== null && processData.value !== null);

const rows = computed<ConvocationRow[]>(() => {
  const byPeriod = new Map((processData.value?.processes ?? []).map((process) => [process.period_id, process]));
  return [...(governance.value?.catalogs.periods ?? [])]
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))
    .map((period) => ({ ...period, process: byPeriod.get(period.id) ?? null }));
});
const stateLabel = (row: ConvocationRow): string => row.process
  ? ({ abierto: 'Abierto', pausado: 'Pausado', cerrado: 'Cerrado' })[row.process.state]
  : 'Sin iniciar';
const stateTone = (row: ConvocationRow): StatusTone => row.process
  ? ({ abierto: 'success', pausado: 'warning', cerrado: 'info' } as const)[row.process.state]
  : 'neutral';
const filter = useClientFilter(rows, (row) => [row.code], {
  estado: { matches: (row, value) => (value === 'sin_iniciar' ? row.process === null : row.process?.state === value) },
});
const inProgress = computed(() => Boolean(governance.value?.lock_reason) || rows.value.some((row) => row.process?.state === 'abierto' || row.process?.state === 'pausado'));
const { items: page, meta, setPage } = useClientPagination(() => filter.items.value);
const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'medium' });

const load = async (): Promise<void> => {
  loading.value = true; error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace(paths.dashboard); return; }
    [governance.value, processData.value] = await Promise.all([getAcademicGovernance(), getProcesses()]);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las convocatorias.';
  } finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
onMounted(load);
</script>

<template>
  <PageFrame title="Convocatorias" description="Periodos lectivos y sus fechas de clases y de elaboración de sílabos." size="wide">
    <template v-if="loaded && inProgress" #banner>
      <ProcessLockAlert banner title="Convocatoria en curso" message="Hay una convocatoria abierta o pausada. Finalícela o elimínela antes de abrir otra." hide-action />
    </template>
    <template #actions>
      <ConvocationPeriodSheet v-if="loaded" :disabled="inProgress" @saved="changed" />
    </template>
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !loaded" variant="table" :columns="4" :filters="1" :actions="false" />
    <div v-if="loaded" class="flex flex-col gap-4"><Card class="py-3"><CardContent class="px-3">
      <ClientFilterBar :filter="filter" input-id="processes-search" label="Buscar período" placeholder="Buscar por período">
        <template #filters>
          <Field><FieldLabel for="processes-search-state" class="sr-only">Estado</FieldLabel>
            <Select v-model="filter.values.estado.value"><SelectTrigger id="processes-search-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="sin_iniciar">Sin iniciar</SelectItem><SelectItem value="abierto">Abiertos</SelectItem><SelectItem value="pausado">Pausados</SelectItem><SelectItem value="cerrado">Cerrados</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </template>
      </ClientFilterBar>
      </CardContent></Card>
      <Table label="Convocatorias" data-cards="true">
        <TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Clases</TableHead><TableHead>Elaboración de sílabos</TableHead><TableHead class="text-center">Estado</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="page.length === 0" :colspan="4">{{ filter.active.value ? 'Ningún período coincide con los filtros.' : 'No hay periodos registrados. Cree el primero con «Nueva convocatoria».' }}</TableEmpty>
          <TableRow v-for="row in page" v-else :key="row.id" class="cursor-pointer" tabindex="0" :aria-label="`Opciones de ${row.code}`" @click="activateRow($event, () => select(row))" @keydown.enter.self.prevent="select(row)" @keydown.space.self.prevent="select(row)">
            <TableCell>{{ row.code }}</TableCell>
            <TableCell><time :datetime="row.starts_on">{{ formatDate(row.starts_on) }}</time> → <time :datetime="row.ends_on">{{ formatDate(row.ends_on) }}</time></TableCell>
            <TableCell v-if="row.process"><time :datetime="row.process.starts_at">{{ formatDate(row.process.starts_at) }}</time> → <time :datetime="row.process.due_at">{{ formatDate(row.process.due_at) }}</time></TableCell>
            <TableCell v-else class="text-muted-foreground">Sin fechas</TableCell>
            <TableCell class="text-center"><StatusBadge :label="stateLabel(row)" :tone="stateTone(row)" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" label="Paginación de convocatorias" @update:page="setPage" />
    </div>
    <template v-if="current">
      <ConvocationOptionsDialog v-model:open="sheetOpen" :row="current" @action="runAction" />
      <ConvocationRowActions ref="rowActions" :key="current.id" :row="current" :menu="false" @changed="changed" />
    </template>
  </PageFrame>
</template>
