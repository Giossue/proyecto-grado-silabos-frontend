<script setup lang="ts">
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { activateRow } from '@/lib/rowActivation';
import { computed, onMounted, reactive, ref } from 'vue';
import { History } from '@lucide/vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getLibraryReviews, type LibraryReviewsPage } from '@/api/library';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import MetricTiles from '@/components/domain/MetricTiles.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LIBRARY_STATE_FILTERS, libraryStateLabel, libraryStateTone } from '@/lib/libraryStates';
import { paths } from '@/lib/routes';
import { latestRequest } from '@/lib/latestRequest';
import { rememberLibraryFaculty, savedLibraryFaculty } from '@/lib/libraryFaculty';

const route = useRoute();
const router = useRouter();
const data = ref<LibraryReviewsPage | null>(null);
const summary = ref<Dashboard | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const queryText = (value: unknown): string => typeof value === 'string' ? value : '';
const filters = reactive({
  q: queryText(route.query.q),
  state: queryText(route.query.state) || 'all',
  faculty: queryText(route.query.faculty) || savedLibraryFaculty() || 'all',
});
const filtersActive = computed(() => filters.q !== '' || filters.state !== 'all' || filters.faculty !== 'all');
const requests = latestRequest();
const initialPage = Number(queryText(route.query.page)) || 1;
const stateOptions = Object.entries(LIBRARY_STATE_FILTERS).map(([value, label]) => ({ value, label }));
const periods = computed(() => [...new Set((data.value?.reviews.data ?? []).map((item) => item.period))]);

const syncUrl = (page: number): void => {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.state !== 'all') query.state = filters.state;
  if (filters.faculty !== 'all') query.faculty = filters.faculty;
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};

const load = async (page = 1, withSummary = false): Promise<void> => {
  const ticket = requests.begin();
  loading.value = true;
  error.value = null;
  try {
    const [reviews, dashboard] = await Promise.all([
      getLibraryReviews({ q: filters.q, state: filters.state, faculty: filters.faculty, page }),
      withSummary ? getDashboard().catch(() => null) : summary.value,
    ]);
    if (!requests.isCurrent(ticket)) return;
    data.value = reviews;
    summary.value = dashboard;
    rememberLibraryFaculty(filters.faculty);
    syncUrl(page);
  } catch (reason) {
    if (!requests.isCurrent(ticket)) return;
    if (reason instanceof ApiError && reason.status === 422 && filters.faculty !== 'all') {
      filters.faculty = 'all';
      rememberLibraryFaculty(filters.faculty);
      await load(page, withSummary);
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las revisiones de biblioteca.';
  } finally {
    if (requests.isCurrent(ticket)) loading.value = false;
  }
};

const clearFilters = (): void => {
  Object.assign(filters, { q: '', state: 'all', faculty: 'all' });
  void load();
};

onMounted(() => { void load(initialPage, true); });
</script>

<template>
  <PageFrame title="Revisiones de biblioteca" description="Bibliografía de los sílabos enviados." size="wide" :loading="!data">
    <template #actions><TooltipProvider><Tooltip><TooltipTrigger as-child><Button as-child variant="ghost" size="icon"><RouterLink :to="paths.library.history" aria-label="Historial"><History aria-hidden="true" /></RouterLink></Button></TooltipTrigger><TooltipContent>Historial</TooltipContent></Tooltip></TooltipProvider></template>
    <template v-if="periods.length > 0" #meta><Badge v-for="period in periods" :key="period" variant="secondary">Período {{ period }}</Badge></template>
    <LoadErrorState v-if="error" :message="error" @retry="load(1, true)" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="3" :filters="2" :actions="false" chip metrics />
    <MetricTiles v-if="data && summary?.metrics.length" :metrics="summary.metrics" />
    <div v-if="data" class="flex flex-col gap-4"><Card class="py-3"><CardContent class="px-3">
        <form @submit.prevent="load()">
          <FilterToolbar :active="filtersActive" @clear="clearFilters">
            <template #search>
              <Field>
                <FieldLabel for="library-search" class="sr-only">Buscar por asignatura, código, carrera o docente</FieldLabel>
                <Input id="library-search" v-model="filters.q" type="search" maxlength="120" placeholder="Buscar por asignatura, código, carrera o docente" />
              </Field>
            </template>
            <template #filters>
              <Field>
                <FieldLabel for="library-faculty" class="sr-only">Facultad</FieldLabel>
                <Select v-model="filters.faculty" name="faculty">
                  <SelectTrigger id="library-faculty"><SelectValue placeholder="Todas las facultades" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todas las facultades</SelectItem>
                      <SelectItem v-for="faculty in data.faculties ?? []" :key="faculty.id" :value="faculty.id">{{ faculty.name }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel for="library-state" class="sr-only">Estado</FieldLabel>
                <Select v-model="filters.state" name="state">
                  <SelectTrigger id="library-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem v-for="option in stateOptions" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </template>
          </FilterToolbar>
        </form></CardContent></Card>
        <Table label="Revisiones de biblioteca">
          <TableHeader>
            <TableRow>
              <TableHead>Carrera</TableHead>
              <TableHead>Docente</TableHead>
              <TableHead class="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in data.reviews.data" :key="item.revision_id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir revisión de ${item.subject}`" @click="activateRow($event, () => router.push(paths.library.review(item.revision_id)))" @keydown.enter.self.prevent="router.push(paths.library.review(item.revision_id))" @keydown.space.self.prevent="router.push(paths.library.review(item.revision_id))">
              <TableCell>{{ item.career }}</TableCell>
              <TableCell>{{ item.teachers.join(', ') }}</TableCell>
              <TableCell class="text-center"><StatusBadge :label="libraryStateLabel(item.state)" :tone="libraryStateTone(item.state)" /></TableCell>
            </TableRow>
            <TableEmpty v-if="data.reviews.data.length === 0" :colspan="3">No hay sílabos para los filtros seleccionados.</TableEmpty>
          </TableBody>
        </Table>
        <TablePagination :meta="data.reviews" label="Paginación de revisiones de biblioteca" @update:page="load" />
      </div>
  </PageFrame>
</template>
