<script setup lang="ts">
import { SYLLABUS_STATE_OPTIONS } from '@/lib/syllabusStates';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import PageFrame from '@/components/domain/PageFrame.vue';
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { paths } from '@/lib/routes';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import { Inbox } from '@lucide/vue';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const router = useRouter();
const result = ref<SyllabiResponse | null>(null);
const query = ref('');
const state = ref('all');
const period = ref<string | null>(null);
const error = ref<string | null>(null);

const load = async (): Promise<void> => {
  error.value = null;
  try { result.value = await getTeacherSyllabi({ q: query.value, state: state.value }); }
  catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus sílabos.';
  }
};
const formatSavedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin guardados';
const periods = computed(() => [...new Set((result.value?.syllabi.data ?? []).map((syllabus) => syllabus.period))]);
watch(periods, (value) => { if (value.length === 1) period.value = value[0]; });
const clearFilters = (): void => {
  query.value = '';
  state.value = 'all';
  void load();
};
const openSyllabus = (id: string): void => { void router.push(paths.teacher.syllabus(id)); };
onMounted(load);
</script>

<template>
  <PageFrame :title="period ? `Sílabos - Período ${period}` : 'Mis sílabos'" description="Los sílabos de las materias que usted dicta." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <Card v-if="result">
      <CardContent>
        <form @submit.prevent="load()">
          <FilterToolbar @clear="clearFilters">
            <template #search><Field><FieldLabel for="syllabi-search" class="sr-only">Buscar por asignatura</FieldLabel><Input id="syllabi-search" v-model="query" type="search" placeholder="Buscar por asignatura" /></Field></template>
            <template #filters><Field><FieldLabel for="syllabi-state" class="sr-only">Estado</FieldLabel><Select v-model="state" name="state"><SelectTrigger id="syllabi-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem v-for="option in SYLLABUS_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select></Field></template>
          </FilterToolbar>
        </form>
      </CardContent>
    </Card>
    <div v-if="!result && !error" class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      <Skeleton v-for="index in 2" :key="index" class="h-32 rounded-xl" />
    </div>
    <Card v-else-if="result && result.syllabi.data.length === 0">
      <Empty class="gap-3 border-0 p-6 md:p-10">
        <EmptyHeader class="gap-3">
          <EmptyMedia class="text-muted-foreground [&_svg]:size-6"><Inbox aria-hidden="true" /></EmptyMedia>
          <EmptyTitle class="text-sm text-muted-foreground">{{ query || state !== 'all' ? 'Ningún sílabo coincide con la búsqueda.' : 'No tiene sílabos asignados' }}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    </Card>
    <ul v-else-if="result" class="grid gap-4 sm:grid-cols-2" aria-label="Mis sílabos">
      <li v-for="syllabus in result.syllabi.data" :key="syllabus.id">
        <Card
          class="h-full cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          tabindex="0"
          :aria-label="`Abrir sílabo de ${syllabus.subject}`"
          @click="openSyllabus(syllabus.id)"
          @keydown.enter.self.prevent="openSyllabus(syllabus.id)"
          @keydown.space.self.prevent="openSyllabus(syllabus.id)"
        >
          <CardHeader>
            <CardTitle>{{ syllabus.subject }}</CardTitle>
            <p class="text-sm text-muted-foreground">{{ syllabus.parallels.length === 1 ? 'Paralelo' : 'Paralelos' }}: {{ syllabus.parallels.join(', ') }}</p>
          </CardHeader>
          <CardContent class="flex flex-col gap-1 text-sm">
            <SyllabusStateBadge :state="syllabus.state" />
            <span class="text-muted-foreground">{{ syllabus.guardado_en ? `Último guardado: ${formatSavedAt(syllabus.guardado_en)}` : 'Sin guardados' }}</span>
          </CardContent>
        </Card>
      </li>
    </ul>
  </PageFrame>
</template>
