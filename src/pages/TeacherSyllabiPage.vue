<script setup lang="ts">
import { SYLLABUS_STATE_OPTIONS, syllabusStateLabel } from '@/lib/syllabusStates';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { paths } from '@/lib/routes';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const router = useRouter();
const result = ref<SyllabiResponse | null>(null);
const query = ref('');
const state = ref('all');
const error = ref<string | null>(null);

const load = async (page = 1): Promise<void> => {
  error.value = null;
  try { result.value = await getTeacherSyllabi({ q: query.value, state: state.value, page }); }
  catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus sílabos.';
  }
};
const formatSavedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin guardados';
const formatStartedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium' }) : 'Sin iniciar';
const clearFilters = (): void => {
  query.value = '';
  state.value = 'all';
  void load();
};
// El período se muestra en la descripción de la página en lugar de una columna.
const description = computed(() => {
  const periods = [...new Set((result.value?.syllabi.data ?? []).map((syllabus) => syllabus.period))];
  return periods.length === 1 ? `Sílabos del período ${periods[0]}.` : 'Los sílabos de las materias que usted dicta.';
});
const openSyllabus = (id: string): void => { void router.push(paths.teacher.syllabus(id)); };
onMounted(load);
</script>

<template>
  <PageFrame title="Mis sílabos" :description="description">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <Card>
      <CardContent class="flex flex-col gap-4">
        <form @submit.prevent="load()">
          <FilterToolbar @clear="clearFilters">
            <template #search><Field><FieldLabel for="syllabi-search" class="sr-only">Buscar por asignatura, código o período</FieldLabel><Input id="syllabi-search" v-model="query" type="search" placeholder="Buscar por asignatura, código o período" /></Field></template>
            <template #filters><Field><FieldLabel for="syllabi-state" class="sr-only">Estado</FieldLabel><Select v-model="state" name="state"><SelectTrigger id="syllabi-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem v-for="option in SYLLABUS_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select></Field></template>
          </FilterToolbar>
        </form>
        <LoadingSkeleton v-if="!result && !error" variant="table-body" :columns="5" :search="false" :filters="0" :actions="false" />
        <Table v-if="result">
          <TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Paralelos</TableHead><TableHead>Estado</TableHead><TableHead>Iniciado</TableHead><TableHead>Último guardado</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableEmpty v-if="result.syllabi.data.length === 0" :colspan="5">No tiene sílabos asignados con este rol.</TableEmpty>
            <TableRow v-for="syllabus in result.syllabi.data" v-else :key="syllabus.id" class="cursor-pointer" role="link" tabindex="0" :aria-label="`Abrir sílabo de ${syllabus.subject}`" @click="openSyllabus(syllabus.id)" @keydown.enter.prevent="openSyllabus(syllabus.id)"><TableCell>{{ syllabus.subject }}</TableCell><TableCell><div class="flex flex-wrap gap-1.5"><Badge v-for="parallel in syllabus.parallels" :key="parallel" variant="outline">{{ parallel }}</Badge></div></TableCell><TableCell>{{ syllabusStateLabel(syllabus.state) ?? 'Estado no disponible' }}</TableCell><TableCell>{{ formatStartedAt(syllabus.iniciado_en) }}</TableCell><TableCell>{{ formatSavedAt(syllabus.guardado_en) }}</TableCell></TableRow>
          </TableBody>
        </Table>
        <TablePagination v-if="result" :meta="result.syllabi" label="Paginación de sílabos asignados" @update:page="load" />
      </CardContent>
    </Card>
  </PageFrame>
</template>
