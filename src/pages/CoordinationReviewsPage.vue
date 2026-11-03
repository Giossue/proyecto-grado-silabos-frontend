<script setup lang="ts">
import { formatDateDisplay } from '@/lib/dateDisplay';
import { activateRow } from '@/lib/rowActivation';
import { ChartNoAxesColumn, Inbox } from '@lucide/vue';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getReviews, type ReviewsPage } from '@/api/reviews';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import ConvocationActions from '@/components/domain/syllabus/ConvocationActions.vue';
import ConvocationTrackingTable from '@/components/domain/syllabus/ConvocationTrackingTable.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { paths, reviewAreaPaths } from '@/lib/routes';
import { toast } from '@/lib/toast';
import { setupChecklistState } from '@/state/setupChecklist';
import { latestRequest } from '@/lib/latestRequest';
import { queryPage, queryText, syncFilters } from '@/lib/urlFilters';
import { deadlineState } from '@/state/deadline';

const route = useRoute();
const router = useRouter();
const data = ref<ReviewsPage | null>(null);
const summary = ref<Dashboard | null>(null);
watch(() => summary.value?.setup, (setup) => { if (setup !== undefined) setupChecklistState.update(setup); });
const openHint = computed(() => summary.value?.setup?.steps.find((step) => step.key === 'convocation')?.hint ?? '');
const area = ref(reviewAreaPaths());
const loading = ref(true);
const tab = ref(queryText(route.query.tab) === 'seguimiento' ? 'seguimiento' : 'cola');
const filters = reactive({ search: queryText(route.query.search) });
const filtersActive = computed(() => filters.search !== '');
const requests = latestRequest();
const error = ref<string | null>(null);
const convocationId = computed(() => summary.value?.coordination_convocation?.convocation_id ?? null);

const load = async (page = 1, withSummary = false): Promise<void> => {
  const ticket = requests.begin();
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (!requests.isCurrent(ticket)) return;
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    area.value = reviewAreaPaths();
    const [reviews, dashboard] = await Promise.all([
      getReviews({ search: filters.search, page }),
      withSummary ? getDashboard().catch(() => null) : summary.value,
    ]);
    if (!requests.isCurrent(ticket)) return;
    data.value = reviews;
    summary.value = dashboard;
    syncFilters(router, { search: filters.search, tab: tab.value === 'seguimiento' ? 'seguimiento' : '' }, page);
  } catch (reason) {
    if (requests.isCurrent(ticket)) error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la cola de revisión';
  } finally { if (requests.isCurrent(ticket)) loading.value = false; }
};
const clearFilters = (): void => {
  Object.assign(filters, { search: '' });
  void load();
};
const changed = async (message: string): Promise<void> => {
  toast.success(message);
  const [dashboard] = await Promise.all([getDashboard().catch(() => summary.value), deadlineState.load()]);
  summary.value = dashboard;
};

onMounted(() => { void load(queryPage(route.query.page), true); });
watch(tab, (value) => { void router.replace({ query: { ...route.query, tab: value === 'seguimiento' ? 'seguimiento' : undefined } }); });
</script>

<template>
  <PageFrame title="Revisión" description="Lo que envían los docentes de su carrera y el avance de cada sílabo" size="wide" :loading="!data && !error">
    <template #actions>
      <ConvocationActions v-if="summary?.coordination_convocation" :convocation="summary.coordination_convocation" :blocked-reason="openHint" @changed="changed" />
    </template>
    <LoadErrorState v-if="error" :message="error" @retry="load(1, true)" /><LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="1" :cell-lines="[2, 1, 1, 2]" :actions="false" :tabs="2" />
    <Tabs v-if="data" v-model="tab" class="gap-4">
      <TabsList class="h-11 justify-start" aria-label="Vistas de revisión">
        <TabsTrigger value="cola" class="flex-none gap-2 px-4 data-[state=active]:font-semibold"><Inbox aria-hidden="true" />Cola de revisión</TabsTrigger>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="flex-none" :class="convocationId ? '' : '[&_button]:pointer-events-none'" tabindex="-1">
                <TabsTrigger value="seguimiento" :disabled="!convocationId" class="flex-none gap-2 px-4 data-[state=active]:font-semibold"><ChartNoAxesColumn aria-hidden="true" />Seguimiento</TabsTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent v-if="!convocationId">Disponible cuando abra la convocatoria de su carrera</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>
      <TabsContent value="cola" class="flex flex-col gap-4">
        <Card class="py-3"><CardContent class="px-3">
          <form @submit.prevent="load()"><FilterToolbar :active="filtersActive" @clear="clearFilters"><template #search><Field><FieldLabel for="review-search" class="sr-only">Buscar por asignatura o código</FieldLabel><Input id="review-search" v-model="filters.search" type="search" maxlength="120" placeholder="Buscar por asignatura o código" /></Field></template></FilterToolbar></form>
        </CardContent></Card>
        <Table label="Revisiones de coordinación"><TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Docente</TableHead><TableHead class="text-center">Revisión</TableHead><TableHead class="text-center">Enviado</TableHead></TableRow></TableHeader><TableBody>
          <TableRow v-for="item in data.syllabi.data" :key="item.id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir revisión de ${item.subject}`" @click="activateRow($event, () => router.push(area.review(item.revision_id)))" @keydown.enter.self.prevent="router.push(area.review(item.revision_id))" @keydown.space.self.prevent="router.push(area.review(item.revision_id))"><TableCell><div>{{ item.subject }}</div><div class="text-sm text-muted-foreground">{{ item.code }} · {{ item.period }}</div></TableCell><TableCell>{{ item.teachers.join(', ') }}</TableCell><TableCell class="text-center">N.º {{ item.revision_number }}</TableCell><TableCell class="text-center">{{ item.submitted_at ? formatDateDisplay(item.submitted_at, { dateStyle: 'medium' }) : '—' }}</TableCell></TableRow>
          <TableEmpty v-if="data.syllabi.data.length === 0" :colspan="4">No hay sílabos por revisar</TableEmpty>
        </TableBody></Table>
        <TablePagination :meta="data.syllabi" label="Paginación de expedientes en revisión" @update:page="load" />
      </TabsContent>
      <TabsContent value="seguimiento" class="flex flex-col gap-4">
        <ConvocationTrackingTable v-if="convocationId" :convocation-id="convocationId" />
      </TabsContent>
    </Tabs>
  </PageFrame>
</template>
