<script setup lang="ts">
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { activateRow } from '@/lib/rowActivation';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getLibraryReviews, type LibraryReviewsPage } from '@/api/library';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LIBRARY_STATE_LABELS, libraryStateLabel, libraryStateTone } from '@/lib/libraryStates';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const data = ref<LibraryReviewsPage | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const queryText = (value: unknown): string => typeof value === 'string' ? value : '';
const filters = reactive({
  q: queryText(route.query.q),
  state: queryText(route.query.state) || 'all',
});
const initialPage = Number(queryText(route.query.page)) || 1;
const stateOptions = Object.entries(LIBRARY_STATE_LABELS).map(([value, label]) => ({ value, label }));
const periods = computed(() => [...new Set((data.value?.reviews.data ?? []).map((item) => item.period))]);

const syncUrl = (page: number): void => {
  const query: Record<string, string> = {};
  if (filters.q) query.q = filters.q;
  if (filters.state !== 'all') query.state = filters.state;
  if (page > 1) query.page = String(page);
  void router.replace({ query });
};

const load = async (page = 1): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    data.value = await getLibraryReviews({ q: filters.q, state: filters.state, page });
    syncUrl(page);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las revisiones de biblioteca.';
  } finally {
    loading.value = false;
  }
};

const clearFilters = (): void => {
  Object.assign(filters, { q: '', state: 'all' });
  void load();
};

onMounted(() => { void load(initialPage); });
</script>

<template>
  <PageFrame title="Revisiones de biblioteca" description="Bibliografía de los sílabos enviados." size="wide">
    <template v-if="periods.length > 0" #meta><Badge v-for="period in periods" :key="period" variant="secondary">Período {{ period }}</Badge></template>
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="3" :filters="1" :actions="false" chip />
    <div v-if="data" class="flex flex-col gap-4"><Card class="py-3"><CardContent class="px-3">
        <form @submit.prevent="load()">
          <FilterToolbar @clear="clearFilters">
            <template #search>
              <Field>
                <FieldLabel for="library-search" class="sr-only">Buscar por asignatura o código</FieldLabel>
                <Input id="library-search" v-model="filters.q" type="search" placeholder="Buscar por asignatura o código" />
              </Field>
            </template>
            <template #filters>
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
