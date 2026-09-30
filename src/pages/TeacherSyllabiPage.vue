<script setup lang="ts">
import { SYLLABUS_STATE_OPTIONS, syllabusStateLabel } from '@/lib/syllabusStates';
import { syllabusStateLabel } from '@/lib/syllabusStates';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Eye } from '@lucide/vue';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { paths } from '@/lib/routes';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
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
onMounted(load);
</script>

<template>
  <PageFrame title="Mis sílabos" description="Los sílabos de las materias que usted dicta.">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <Card>
      <CardContent class="flex flex-col gap-4">
        <form @submit.prevent="load()">
          <FilterToolbar @clear="clearFilters">
            <template #search><Field><FieldLabel for="syllabi-search" class="sr-only">Buscar</FieldLabel><Input id="syllabi-search" v-model="query" type="search" placeholder="Buscar por asignatura, código o convocatoria" /></Field></template>
            <template #filters><Field><FieldLabel for="syllabi-state" class="sr-only">Estado</FieldLabel><Select v-model="state" name="state"><SelectTrigger id="syllabi-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los estados</SelectItem><SelectItem v-for="option in SYLLABUS_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectContent></Select></Field></template>
          </FilterToolbar>
        </form>
        <LoadingSkeleton v-if="!result && !error" variant="table-body" :columns="6" />
        <Table v-if="result">
          <TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Convocatoria</TableHead><TableHead>Estado</TableHead><TableHead>Iniciado</TableHead><TableHead>Último guardado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableEmpty v-if="result.syllabi.data.length === 0" :colspan="6">No tiene sílabos asignados con este rol.</TableEmpty>
            <TableRow v-for="syllabus in result.syllabi.data" v-else :key="syllabus.id"><TableCell><span>{{ syllabus.subject }}</span><div class="text-sm text-muted-foreground">{{ syllabus.code }} · Paralelo(s) {{ syllabus.parallels.join(', ') }}</div></TableCell><TableCell><div>{{ syllabus.convocation }}</div><div class="text-sm text-muted-foreground">{{ syllabus.period }}</div></TableCell><TableCell>{{ syllabusStateLabel(syllabus.state) ?? 'Estado no disponible' }}</TableCell><TableCell>{{ formatStartedAt(syllabus.iniciado_en) }}</TableCell><TableCell>{{ formatSavedAt(syllabus.guardado_en) }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${syllabus.subject}`"><DropdownMenuItem @select="router.push(paths.teacher.syllabus(syllabus.id))"><Eye aria-hidden="true" />Abrir sílabo</DropdownMenuItem></TableActionsMenu></TableCell></TableRow>
          </TableBody>
        </Table>
        <TablePagination v-if="result" :meta="result.syllabi" label="Paginación de sílabos asignados" @update:page="load" />
      </CardContent>
    </Card>
  </PageFrame>
</template>
