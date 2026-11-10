<script setup lang="ts">
import { ArrowLeft, FileText } from '@lucide/vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getCoordinationHistory, type CoordinationHistoryItem, type CoordinationHistoryPage } from '@/api/reviews';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import TableCardLine from '@/components/domain/TableCardLine.vue';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { goBack } from '@/lib/goBack';
import { latestRequest } from '@/lib/latestRequest';
import { openRevisionPdf } from '@/lib/openPdf';
import { paths } from '@/lib/routes';
import { activateRow } from '@/lib/rowActivation';
import { toast } from '@/lib/toast';

const route = useRoute();
const router = useRouter();
const data = ref<CoordinationHistoryPage | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const openingPdf = ref<string | null>(null);
const queryText = (value: unknown): string => typeof value === 'string' ? value : '';
const filters = reactive({
  q: queryText(route.query.q),
  period: queryText(route.query.period) || 'all',
});
const filtersActive = computed(() => filters.q !== '' || filters.period !== 'all');
const requests = latestRequest();
const initialPage = Number(queryText(route.query.page)) || 1;
const groups = computed(() => {
  const byPeriod = new Map<string, CoordinationHistoryItem[]>();
  for (const item of data.value?.syllabi.data ?? []) byPeriod.set(item.period, [...(byPeriod.get(item.period) ?? []), item]);

  return [...byPeriod.entries()].map(([period, items]) => ({ period, items }));
});

const syncUrl = (page: number): void => {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.period !== 'all') query.period = filters.period;
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};

const load = async (page = 1): Promise<void> => {
  const ticket = requests.begin();
  loading.value = true;
  error.value = null;
  try {
    const response = await getCoordinationHistory({ q: filters.q, period: filters.period, page });
    if (!requests.isCurrent(ticket)) return;
    data.value = response;
    syncUrl(page);
  } catch (reason) {
    if (!requests.isCurrent(ticket)) return;
    if (reason instanceof ApiError && reason.status === 422 && filters.period !== 'all') {
      filters.period = 'all';
      await load(page);
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el historial';
  } finally {
    if (requests.isCurrent(ticket)) loading.value = false;
  }
};

const clearFilters = (): void => {
  Object.assign(filters, { q: '', period: 'all' });
  void load();
};
const open = (item: CoordinationHistoryItem): void => { void router.push(paths.coordination.review(item.revision_id)); };
const openPdf = async (item: CoordinationHistoryItem): Promise<void> => {
  openingPdf.value = item.revision_id;
  const failure = await openRevisionPdf(item.revision_id);
  openingPdf.value = null;
  if (failure) toast.error(failure);
};
const formatApprovedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium' }) : '—';

onMounted(() => { void load(initialPage); });
</script>

<template>
  <PageFrame title="Historial" description="Sílabos aprobados de períodos anteriores de su carrera, en solo lectura" size="wide" :loading="!data && !error">
    <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, paths.coordination.reviews)"><ArrowLeft aria-hidden="true" />Volver a revisión</Button></template>
    <LoadErrorState v-if="error" :message="error" @retry="load()" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="6" :filters="1" :actions="false" />
    <div v-if="data" class="flex flex-col gap-4">
      
        <form @submit.prevent="load()">
          <FilterToolbar :active="filtersActive" @clear="clearFilters">
            <template #search>
              <Field>
                <FieldLabel for="coordination-history-search" class="sr-only">Buscar por asignatura o código</FieldLabel>
                <Input id="coordination-history-search" v-model="filters.q" type="search" maxlength="120" placeholder="Buscar por asignatura o código" />
              </Field>
            </template>
            <template #filters>
              <Field>
                <FieldLabel for="coordination-history-period" class="sr-only">Período</FieldLabel>
                <Select v-model="filters.period" name="period">
                  <SelectTrigger id="coordination-history-period"><SelectValue placeholder="Todos los períodos" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      <SelectItem v-for="period in data.periods" :key="period.id" :value="period.id">{{ period.code }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </template>
          </FilterToolbar>
        </form>
      
      <Table v-if="groups.length === 0" label="Historial de Coordinación">
        <TableBody>
          <TableEmpty :colspan="6">No hay sílabos aprobados de períodos anteriores con estos filtros</TableEmpty>
        </TableBody>
      </Table>
      <div v-for="group in groups" :key="group.period" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold">Período {{ group.period }}</h2>
        <Table :label="`Sílabos aprobados del período ${group.period}`">
          <TableHeader>
            <TableRow>
              <TableHead>Asignatura</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Paralelos</TableHead>
              <TableHead>Elaborado por</TableHead>
              <TableHead>Aprobado</TableHead>
              <TableHead class="w-12 text-center"><span class="sr-only">PDF</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in group.items" :key="item.revision_id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir sílabo de ${item.subject}`" @click="activateRow($event, () => open(item))" @keydown.enter.self.prevent="open(item)" @keydown.space.self.prevent="open(item)">
              <TableCell>{{ item.subject }}<TableCardLine>{{ item.code }} · {{ item.parallels.length === 1 ? 'Paralelo' : 'Paralelos' }} {{ item.parallels.join(', ') }}</TableCardLine></TableCell>
              <TableCell data-card-hide="true">{{ item.code }}</TableCell>
              <TableCell data-card-hide="true">{{ item.parallels.join(', ') }}</TableCell>
              <TableCell>{{ item.author ?? '—' }}</TableCell>
              <TableCell>{{ formatApprovedAt(item.approved_at) }}</TableCell>
              <TableCell class="text-center" data-card-no-label="true">
                <IconTooltip label="Ver PDF"><Button type="button" variant="ghost" size="icon" :aria-label="`Ver PDF de ${item.subject}`" :disabled="openingPdf === item.revision_id" @click="openPdf(item)"><Spinner v-if="openingPdf === item.revision_id" /><FileText v-else aria-hidden="true" /></Button></IconTooltip>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <TablePagination :meta="data.syllabi" label="Paginación del historial" @update:page="load" />
    </div>
  </PageFrame>
</template>
