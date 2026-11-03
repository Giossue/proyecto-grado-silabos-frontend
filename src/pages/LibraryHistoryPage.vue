<script setup lang="ts">
import { activateRow } from '@/lib/rowActivation';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getLibraryHistory, type LibraryHistoryPage } from '@/api/library';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { ArrowLeft } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { goBack } from '@/lib/goBack';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { rememberLibraryFaculty, savedLibraryFaculty } from '@/lib/libraryFaculty';
import { paths } from '@/lib/routes';
import { latestRequest } from '@/lib/latestRequest';

const route = useRoute();
const router = useRouter();
const data = ref<LibraryHistoryPage | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const queryText = (value: unknown): string => typeof value === 'string' ? value : '';
const filters = reactive({
  q: queryText(route.query.q),
  faculty: queryText(route.query.faculty) || savedLibraryFaculty() || 'all',
  period: queryText(route.query.period) || 'all',
  who: route.query.mine === '1' ? 'mine' : 'all',
});
const filtersActive = computed(() => filters.q !== '' || filters.faculty !== 'all' || filters.period !== 'all' || filters.who !== 'all');
const requests = latestRequest();
const initialPage = Number(queryText(route.query.page)) || 1;

const syncUrl = (page: number): void => {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.faculty !== 'all') query.faculty = filters.faculty;
  if (filters.period !== 'all') query.period = filters.period;
  if (filters.who === 'mine') query.mine = '1';
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};

const load = async (page = 1): Promise<void> => {
  const ticket = requests.begin();
  loading.value = true;
  error.value = null;
  try {
    const response = await getLibraryHistory({ q: filters.q, faculty: filters.faculty, period: filters.period, mine: filters.who === 'mine', page });
    if (!requests.isCurrent(ticket)) return;
    data.value = response;
    rememberLibraryFaculty(filters.faculty);
    syncUrl(page);
  } catch (reason) {
    if (!requests.isCurrent(ticket)) return;
    if (reason instanceof ApiError && reason.status === 422 && (filters.faculty !== 'all' || filters.period !== 'all')) {
      Object.assign(filters, { faculty: 'all', period: 'all' });
      rememberLibraryFaculty(filters.faculty);
      await load(page);
      return;
    }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el historial de biblioteca';
  } finally {
    if (requests.isCurrent(ticket)) loading.value = false;
  }
};

const clearFilters = (): void => {
  Object.assign(filters, { q: '', faculty: 'all', period: 'all', who: 'all' });
  void load();
};

onMounted(() => { void load(initialPage); });
</script>

<template>
  <PageFrame title="Historial" description="Sílabos de períodos terminados, en solo lectura" size="wide" :loading="!data && !error">
    <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, paths.library.reviews)"><ArrowLeft aria-hidden="true" />Volver a revisiones</Button></template>
    <LoadErrorState v-if="error" :message="error" @retry="load()" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="3" :actions="false" />
    <div v-if="data" class="flex flex-col gap-4"><Card class="py-3"><CardContent class="px-3">
        <form @submit.prevent="load()">
          <FilterToolbar :active="filtersActive" @clear="clearFilters">
            <template #search>
              <Field>
                <FieldLabel for="library-history-search" class="sr-only">Buscar por asignatura, código, carrera o docente</FieldLabel>
                <Input id="library-history-search" v-model="filters.q" type="search" maxlength="120" placeholder="Buscar por asignatura, código, carrera o docente" />
              </Field>
            </template>
            <template #filters>
              <Field>
                <FieldLabel for="library-history-who" class="sr-only">Revisados por</FieldLabel>
                <Select v-model="filters.who" name="who">
                  <SelectTrigger id="library-history-who"><SelectValue placeholder="Toda la biblioteca" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Toda la biblioteca</SelectItem>
                      <SelectItem value="mine">Solo los míos</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel for="library-history-period" class="sr-only">Período</FieldLabel>
                <Select v-model="filters.period" name="period">
                  <SelectTrigger id="library-history-period"><SelectValue placeholder="Todos los períodos" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todos los períodos</SelectItem>
                      <SelectItem v-for="period in data.periods" :key="period.id" :value="period.id">{{ period.code }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel for="library-history-faculty" class="sr-only">Facultad</FieldLabel>
                <Select v-model="filters.faculty" name="faculty">
                  <SelectTrigger id="library-history-faculty"><SelectValue placeholder="Todas las facultades" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Todas las facultades</SelectItem>
                      <SelectItem v-for="faculty in data.faculties ?? []" :key="faculty.id" :value="faculty.id">{{ faculty.name }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </template>
          </FilterToolbar>
        </form></CardContent></Card>
        <Table label="Historial de biblioteca">
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead>Carrera</TableHead>
              <TableHead>Docente</TableHead>
              <TableHead>Firmado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in data.reviews.data" :key="item.revision_id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir revisión de ${item.subject}`" @click="activateRow($event, () => router.push(paths.library.review(item.revision_id)))" @keydown.enter.self.prevent="router.push(paths.library.review(item.revision_id))" @keydown.space.self.prevent="router.push(paths.library.review(item.revision_id))">
              <TableCell>{{ item.period }}</TableCell>
              <TableCell>{{ item.career }}</TableCell>
              <TableCell>{{ item.teachers.join(', ') }}</TableCell>
              <TableCell>{{ item.signed_by ?? '—' }}</TableCell>
            </TableRow>
            <TableEmpty v-if="data.reviews.data.length === 0" :colspan="4">{{ filters.who === 'mine' ? 'No hay sílabos revisados por usted con estos filtros' : 'No hay sílabos de períodos terminados con estos filtros' }}</TableEmpty>
          </TableBody>
        </Table>
        <TablePagination :meta="data.reviews" label="Paginación del historial de biblioteca" @update:page="load" />
      </div>
  </PageFrame>
</template>
