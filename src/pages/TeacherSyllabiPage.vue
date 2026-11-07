<script setup lang="ts">
import { SYLLABUS_STATE_OPTIONS } from '@/lib/syllabusStates';
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import PageFrame from '@/components/domain/PageFrame.vue';
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { paths } from '@/lib/routes';
import { latestRequest } from '@/lib/latestRequest';
import { queryPage, queryText, syncFilters } from '@/lib/urlFilters';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import { History, Inbox } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TablePagination from '@/components/domain/TablePagination.vue';

const route = useRoute();
const router = useRouter();
const result = ref<SyllabiResponse | null>(null);
const query = ref(queryText(route.query.q));
const state = ref(queryText(route.query.state) || 'all');
const filtersActive = computed(() => query.value !== '' || state.value !== 'all');
const requests = latestRequest();
const period = ref<string | null>(null);
const error = ref<string | null>(null);

const load = async (page = 1): Promise<void> => {
  const ticket = requests.begin();
  error.value = null;
  try {
    const response = await getTeacherSyllabi({ q: query.value, state: state.value, page });
    if (!requests.isCurrent(ticket)) return;
    result.value = response;
    syncFilters(router, { q: query.value, state: state.value }, page);
  } catch (reason) {
    if (!requests.isCurrent(ticket)) return;
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus sílabos';
  }
};
const periods = computed(() => [...new Set((result.value?.syllabi.data ?? []).map((syllabus) => syllabus.period))]);
watch(periods, (value) => { if (value.length === 1) period.value = value[0]; });
const clearFilters = (): void => {
  query.value = '';
  state.value = 'all';
  void load();
};
const SENT_STATES = ['en_revision', 'aprobado'];
const openSyllabus = (id: string, state: string): void => { void router.push({ path: paths.teacher.syllabus(id), state: { syllabusPreview: SENT_STATES.includes(state) } }); };
onMounted(() => { void load(queryPage(route.query.page)); });
</script>

<template>
  <PageFrame inline-actions :title="period ? `Sílabos - Período ${period}` : 'Mis sílabos'" description="Los sílabos de las materias que usted dicta" size="wide" :loading="!result && !error" :actions-skeleton="!result && !error ? ['w-9'] : []">
    <template #actions><TooltipProvider><Tooltip><TooltipTrigger as-child><Button as-child variant="ghost" size="icon"><RouterLink :to="paths.teacher.history" aria-label="Historial"><History aria-hidden="true" /></RouterLink></Button></TooltipTrigger><TooltipContent>Historial</TooltipContent></Tooltip></TooltipProvider></template>
    <LoadErrorState v-if="error" :message="error" @retry="load()" />
    <Card v-if="result" class="py-3">
      <CardContent class="px-3">
        <form @submit.prevent="load()">
          <FilterToolbar :active="filtersActive" @clear="clearFilters">
            <template #search><Field><FieldLabel for="syllabi-search" class="sr-only">Buscar por asignatura o código</FieldLabel><Input id="syllabi-search" v-model="query" type="search" maxlength="120" placeholder="Buscar por asignatura o código" /></Field></template>
            <template #filters><Field><FieldLabel for="syllabi-state" class="sr-only">Estado</FieldLabel><Select v-model="state" name="state"><SelectTrigger id="syllabi-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem v-for="option in SYLLABUS_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select></Field></template>
          </FilterToolbar>
        </form>
      </CardContent>
    </Card>
    <LoadingSkeleton v-if="!result && !error" variant="syllabus-cards" :rows="3" />
    <Card v-else-if="result && result.syllabi.data.length === 0">
      <Empty class="gap-3 border-0 p-6 md:p-10">
        <EmptyHeader class="gap-3">
          <EmptyMedia class="text-muted-foreground [&_svg]:size-6"><Inbox aria-hidden="true" /></EmptyMedia>
          <EmptyTitle class="text-sm text-muted-foreground">{{ result.filters.q || result.filters.state ? 'Ningún sílabo coincide con la búsqueda' : 'No tiene sílabos asignados' }}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Card>
    <ul v-else-if="result" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mis sílabos">
      <li v-for="syllabus in result.syllabi.data" :key="syllabus.id">
        <Card
          class="h-full cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden"
          tabindex="0"
          :aria-label="`Abrir sílabo de ${syllabus.subject}`"
          @click="openSyllabus(syllabus.id, syllabus.state)"
          @keydown.enter.self.prevent="openSyllabus(syllabus.id, syllabus.state)"
          @keydown.space.self.prevent="openSyllabus(syllabus.id, syllabus.state)"
        >
          <CardHeader>
            <CardTitle>{{ syllabus.subject }}</CardTitle>
            <p class="text-sm text-muted-foreground">{{ syllabus.parallels.length === 1 ? 'Paralelo' : 'Paralelos' }}: {{ syllabus.parallels.join(', ') }}</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-1 text-sm">
            <SyllabusStateBadge :state="syllabus.state" />
          </CardContent>
        </Card>
      </li>
    </ul>
    <TablePagination v-if="result && result.syllabi.data.length > 0" :meta="result.syllabi" label="Paginación de mis sílabos" @update:page="load" />
  </PageFrame>
</template>
