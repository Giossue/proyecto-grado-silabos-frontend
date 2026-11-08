<script setup lang="ts">
import { Download } from '@lucide/vue';
import VisAxis from '@unovis/vue/components/axis';
import VisGroupedBar from '@unovis/vue/components/grouped-bar';
import VisLine from '@unovis/vue/components/line';
import VisStackedBar from '@unovis/vue/components/stacked-bar';
import VisXYContainer from '@unovis/vue/containers/xy-container';
import { CurveType } from '@unovis/ts/types/curve';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { downloadProcessReport, getProcessReport, type ProcessReport, type ReportPayload, type ReportState } from '@/api/reports';
import EmptyState from '@/components/domain/EmptyState.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import StatTile from '@/components/domain/StatTile.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { useClientPagination } from '@/composables/useClientPagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartCrosshair, ChartLegendContent, ChartTooltip, ChartTooltipContent, componentToString } from '@/components/ui/chart';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { toast } from '@/lib/toast';
import { queryText } from '@/lib/urlFilters';

const route = useRoute();
const router = useRouter();
const payload = ref<ReportPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const processId = ref<string>(queryText(route.query.convocatoria));
const exporting = ref(false);
const report = computed<ProcessReport | null>(() => payload.value?.report ?? null);

const STATES: ReportState[] = ['sin_iniciar', 'borrador', 'en_revision', 'correccion_solicitada', 'aprobado'];
const STATE_LABELS: Record<ReportState, string> = { sin_iniciar: 'Sin iniciar', borrador: 'Borrador', en_revision: 'En revisión', correccion_solicitada: 'Devuelto', aprobado: 'Aprobado' };
const STATE_COLORS: Record<ReportState, string> = {
  sin_iniciar: 'var(--muted-foreground)', borrador: 'var(--chart-4)', en_revision: 'var(--primary)', correccion_solicitada: 'var(--destructive)', aprobado: 'var(--success)',
};
const statesConfig = Object.fromEntries(STATES.map((state) => [state, { label: STATE_LABELS[state], color: STATE_COLORS[state] }])) satisfies ChartConfig;
const dailyConfig = { first: { label: 'Primeros envíos', color: 'var(--primary)' }, resubmitted: { label: 'Reenvíos', color: 'var(--chart-4)' } } satisfies ChartConfig;
const returnsConfig = { coordinacion: { label: 'Coordinación', color: 'var(--primary)' }, biblioteca: { label: 'Biblioteca', color: 'var(--chart-2)' } } satisfies ChartConfig;

type CareerRow = ProcessReport['careers'][number];
type DayRow = ProcessReport['daily'][number];
const careerName = (index: number): string => report.value?.careers[index]?.career ?? '';
const dayName = (index: number): string => {
  const day = report.value?.daily[index]?.day;
  return day ? formatDateDisplay(`${day}T12:00:00`, { day: 'numeric', month: 'short' }) : '';
};
// Los tooltips se arman una sola vez al montar (componentToString usa useId).
const label = (name: (index: number) => string) => (value: number | Date): string => name(Number(value));
const statesTooltip = componentToString(statesConfig, ChartTooltipContent, { labelFormatter: label(careerName) });
const dailyTooltip = componentToString(dailyConfig, ChartTooltipContent, { labelFormatter: label(dayName) });
const returnsTooltip = componentToString(returnsConfig, ChartTooltipContent, { labelFormatter: label(careerName) });
const { items: pendingPage, meta: pendingMeta, setPage: setPendingPage } = useClientPagination(() => report.value?.pending ?? [], 20);
const hasReturns = computed(() => (report.value?.careers ?? []).some((row) => row.returns.coordinacion + row.returns.biblioteca > 0));

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    payload.value = await getProcessReport(processId.value || null);
    processId.value = payload.value.report?.process.id ?? '';
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el reporte';
  } finally {
    loading.value = false;
  }
};
const choose = (value: unknown): void => {
  processId.value = String(value);
  void router.replace({ query: { ...route.query, convocatoria: processId.value } });
  void load();
};
const exportWorkbook = async (): Promise<void> => {
  exporting.value = true;
  try {
    const period = report.value?.process.period ?? 'convocatoria';
    await downloadProcessReport(processId.value || null, `reporte-${period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.xlsx`);
  } catch (reason) {
    toast.error(reason instanceof ApiError ? reason.message : 'No se pudo exportar el reporte');
  } finally {
    exporting.value = false;
  }
};
const formatDate = (value: string): string => formatDateDisplay(`${value}T12:00:00`, { dateStyle: 'long' });

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Reportes" description="Cómo va la elaboración de los sílabos en cada convocatoria" size="wide" :loading="loading && !payload && !error">
    <template v-if="payload?.options.length" #actions>
      <Field data-tour="report-process" class="w-72">
        <FieldLabel for="report-process" class="sr-only">Convocatoria</FieldLabel>
        <Select :model-value="processId" @update:model-value="choose">
          <SelectTrigger id="report-process"><SelectValue placeholder="Elija la convocatoria" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="option in payload.options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent>
        </Select>
      </Field>
      <Button type="button" variant="success" data-tour="report-export" :disabled="exporting || !report" @click="exportWorkbook"><Spinner v-if="exporting" data-icon="inline-start" /><Download v-else data-icon="inline-start" aria-hidden="true" />Exportar a Excel</Button>
    </template>

    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !payload" variant="table" metrics :columns="4" :search="false" :filters="0" :actions="false" />
    <EmptyState v-else-if="payload && !report" title="Todavía no hay convocatorias" description="Cuando abra la primera, aquí verá cómo avanza" />

    <div v-else-if="report" class="flex flex-col gap-4">
      <p class="text-sm text-muted-foreground">Elaboración desde el {{ formatDate(report.process.starts_at) }} hasta el {{ formatDate(report.process.due_at) }}</p>

      <div data-tour="report-kpis" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sílabos" :value="report.kpis.total" hint="Uno por paralelo con docente" />
        <StatTile label="Aprobados" :value="report.kpis.approved_percent" suffix="%" hint="Firmados por Coordinación y Biblioteca" />
        <StatTile label="Enviados a tiempo" :value="report.kpis.on_time_percent ?? 0" :suffix="report.kpis.on_time_percent === null ? undefined : '%'" :hint="report.kpis.on_time_percent === null ? 'Todavía no hay envíos' : 'Primer envío antes de la fecha de entrega'" />
        <StatTile label="Días de revisión" :value="report.kpis.review_days ?? 0" :hint="report.kpis.review_days === null ? 'Todavía no hay aprobados' : 'Promedio desde el primer envío hasta la aprobación'" />
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Avance por carrera</CardTitle><CardDescription>Sílabos de cada carrera según su estado</CardDescription></CardHeader>
          <CardContent>
            <ChartContainer :config="statesConfig" class="aspect-auto h-72">
              <VisXYContainer :data="report.careers" :padding="{ top: 8 }">
                <VisStackedBar :x="(_: CareerRow, index: number) => index" :y="STATES.map((state) => (row: CareerRow) => row.states[state])" :color="STATES.map((state) => STATE_COLORS[state])" :rounded-corners="4" :bar-padding="0.25" />
                <VisAxis type="x" :tick-format="careerName" :num-ticks="report.careers.length" :grid-line="false" :domain-line="false" />
                <VisAxis type="y" :num-ticks="4" :domain-line="false" />
                <ChartTooltip />
                <ChartCrosshair :template="statesTooltip" color="transparent" />
              </VisXYContainer>
              <ChartLegendContent />
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Envíos por día</CardTitle><CardDescription>Para ver si los sílabos llegan a tiempo o todos al final</CardDescription></CardHeader>
          <CardContent>
            <EmptyState v-if="report.daily.length === 0" class="h-72 justify-center border-0 shadow-none ring-0" title="Todavía no hay envíos" />
            <ChartContainer v-else :config="dailyConfig" class="aspect-auto h-72" cursor>
              <VisXYContainer :data="report.daily" :padding="{ top: 8 }">
                <VisLine :x="(_: DayRow, index: number) => index" :y="[(row: DayRow) => row.first, (row: DayRow) => row.resubmitted]" :color="[dailyConfig.first.color, dailyConfig.resubmitted.color]" :curve-type="CurveType.MonotoneX" />
                <VisAxis type="x" :tick-format="dayName" :grid-line="false" :domain-line="false" />
                <VisAxis type="y" :num-ticks="4" :domain-line="false" />
                <ChartTooltip />
                <ChartCrosshair :template="dailyTooltip" :color="[dailyConfig.first.color, dailyConfig.resubmitted.color]" />
              </VisXYContainer>
              <ChartLegendContent />
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card v-if="hasReturns">
        <CardHeader><CardTitle>Devoluciones</CardTitle><CardDescription>Veces que Coordinación o Biblioteca pidieron correcciones, por carrera</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer :config="returnsConfig" class="aspect-auto h-64">
            <VisXYContainer :data="report.careers" :padding="{ top: 8 }">
              <VisGroupedBar :x="(_: CareerRow, index: number) => index" :y="[(row: CareerRow) => row.returns.coordinacion, (row: CareerRow) => row.returns.biblioteca]" :color="[returnsConfig.coordinacion.color, returnsConfig.biblioteca.color]" :rounded-corners="4" :group-padding="0.3" />
              <VisAxis type="x" :tick-format="careerName" :num-ticks="report.careers.length" :grid-line="false" :domain-line="false" />
              <VisAxis type="y" :num-ticks="4" :domain-line="false" />
              <ChartTooltip />
              <ChartCrosshair :template="returnsTooltip" color="transparent" />
            </VisXYContainer>
            <ChartLegendContent />
          </ChartContainer>
        </CardContent>
      </Card>

      <section data-tour="report-careers" class="flex flex-col gap-2">
        <h2 class="text-base font-semibold">Por carrera</h2>
        <Table label="Avance por carrera">
          <TableHeader><TableRow><TableHead>Carrera</TableHead><TableHead class="text-center">Total</TableHead><TableHead class="text-center">Aprobados</TableHead><TableHead class="text-center">Pendientes</TableHead><TableHead class="text-center">Devueltos</TableHead><TableHead class="text-center">Atrasados</TableHead><TableHead class="text-center">Avance</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="row in report.careers" :key="row.career">
              <TableCell>{{ row.career }}</TableCell>
              <TableCell class="text-center">{{ row.total }}</TableCell>
              <TableCell class="text-center">{{ row.approved }}</TableCell>
              <TableCell class="text-center">{{ row.pending }}</TableCell>
              <TableCell class="text-center">{{ row.returned }}</TableCell>
              <TableCell class="text-center" :class="row.late > 0 ? 'font-medium text-destructive' : ''">{{ row.late }}</TableCell>
              <TableCell class="text-center">{{ row.progress }} %</TableCell>
            </TableRow>
            <TableEmpty v-if="report.careers.length === 0" :colspan="7">Esta convocatoria no tiene sílabos</TableEmpty>
          </TableBody>
        </Table>
      </section>

      <section class="flex flex-col gap-2">
        <h2 class="text-base font-semibold">Sílabos pendientes</h2>
        <Table label="Sílabos pendientes por docente">
          <TableHeader><TableRow><TableHead>Docente</TableHead><TableHead>Carrera</TableHead><TableHead>Asignatura</TableHead><TableHead class="text-center">Estado</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="row in pendingPage" :key="`${row.career}-${row.subject}-${row.parallel}`">
              <TableCell>{{ row.teachers || 'Sin docente' }}</TableCell>
              <TableCell>{{ row.career }}</TableCell>
              <TableCell>{{ row.subject }} · Paralelo {{ row.parallel }}</TableCell>
              <TableCell class="text-center">{{ STATE_LABELS[row.state] }}<span v-if="row.late" class="ml-1 text-destructive">(atrasado)</span></TableCell>
            </TableRow>
            <TableEmpty v-if="report.pending.length === 0" :colspan="4">Todos los sílabos están aprobados</TableEmpty>
          </TableBody>
        </Table>
        <TablePagination :meta="pendingMeta" label="Paginación de los sílabos pendientes" @update:page="setPendingPage" />
      </section>
    </div>
  </PageFrame>
</template>
