<script setup lang="ts">
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import { activateRow } from '@/lib/rowActivation';
import { REVIEW_STATE_OPTIONS } from '@/lib/syllabusStates';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getReviews, reviewStageLabel, type ReviewsPage } from '@/api/reviews';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paths, reviewAreaPaths } from '@/lib/routes';

const router = useRouter();
const data = ref<ReviewsPage | null>(null);
const area = ref(reviewAreaPaths());
const loading = ref(true);
const filters = reactive({ search: '', state: 'all' });
const error = ref<string | null>(null);
const load = async (page = 1): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    area.value = reviewAreaPaths();
    data.value = await getReviews({ search: filters.search, state: filters.state === 'all' ? '' : filters.state, page });
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la cola de revisión.';
  } finally { loading.value = false; }
};
const clearFilters = (): void => {
  Object.assign(filters, { search: '', state: 'all' });
  void load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Cola de revisión" description="Sílabos que los docentes ya enviaron y esperan revisión.">
        <LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="1" :cell-lines="2" :actions="false" />
    <Card v-if="data"><CardContent class="flex flex-col gap-4">
      <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters"><template #search><Field><FieldLabel for="review-search" class="sr-only">Buscar por asignatura o código</FieldLabel><Input id="review-search" v-model="filters.search" type="search" placeholder="Buscar por asignatura o código" /></Field></template><template #filters><Field><FieldLabel for="review-state" class="sr-only">Estado</FieldLabel><Select v-model="filters.state" name="state"><SelectTrigger id="review-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem v-for="option in REVIEW_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></Select></Field></template></FilterToolbar></form>
      <Table label="Revisiones de coordinación"><TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Docente</TableHead><TableHead>Revisión</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
        <TableRow v-for="item in data.syllabi.data" :key="item.id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir revisión de ${item.subject}`" @click="activateRow($event, () => router.push(area.review(item.revision_id)))" @keydown.enter.self.prevent="router.push(area.review(item.revision_id))" @keydown.space.self.prevent="router.push(area.review(item.revision_id))"><TableCell><div>{{ item.subject }}</div><div class="text-sm text-muted-foreground">{{ item.code }} · {{ item.period }}</div></TableCell><TableCell>{{ item.teachers.join(', ') }}</TableCell><TableCell>N.º {{ item.revision_number }}</TableCell><TableCell><SyllabusStateBadge :state="item.state" /><div v-if="item.stage" class="text-sm text-muted-foreground">{{ reviewStageLabel(item.stage) }}</div></TableCell></TableRow>
        <TableEmpty v-if="data.syllabi.data.length === 0" :colspan="4">No hay expedientes para los filtros seleccionados.</TableEmpty>
      </TableBody></Table>
      <TablePagination :meta="data.syllabi" label="Paginación de expedientes en revisión" @update:page="load" />
    </CardContent></Card>
  </PageFrame>
</template>
