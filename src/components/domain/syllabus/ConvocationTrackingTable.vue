<script setup lang="ts">
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import { SYLLABUS_STATE_OPTIONS } from '@/lib/syllabusStates';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getConvocation, type ConvocationDetail } from '@/api/convocations';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { syllabusStateLabel } from '@/lib/syllabusStates';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';

const props = defineProps<{ convocationId: string }>();
const data = ref<ConvocationDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const syllabusFilter = useClientFilter(
  () => data.value?.convocation.syllabi ?? [],
  (item) => [item.subject, item.code, syllabusStateLabel(item.state)],
  { estado: { matches: (item, value) => item.state === value } },
);
const { items: syllabusPage, meta: syllabusMeta, setPage: setSyllabusPage } = useClientPagination(() => syllabusFilter.items.value, 20, syllabusFilter.criteria);

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  data.value = null;
  try {
    data.value = await getConvocation(props.convocationId);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el seguimiento de la convocatoria.';
  } finally {
    loading.value = false;
  }
};

watch(() => props.convocationId, () => { void load(); }, { immediate: true });
</script>

<template>
  <LoadErrorState v-if="error" :message="error" @retry="load" />
  <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="3" :filters="1" :actions="false" :cell-lines="[2, 2, 1]" />
  <div v-else-if="data" class="flex flex-col gap-4">
    <Card class="py-3"><CardContent class="px-3"><ClientFilterBar
      :filter="syllabusFilter"
      :input-id="`convocation-syllabi-search-${convocationId}`"
      label="Buscar expediente"
      placeholder="Buscar por asignatura o código"
    >
      <template #filters>
        <Field>
          <FieldLabel :for="`convocation-syllabi-search-state-${convocationId}`" class="sr-only">Estado</FieldLabel>
          <Select v-model="syllabusFilter.values.estado.value">
            <SelectTrigger :id="`convocation-syllabi-search-state-${convocationId}`">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem v-for="option in SYLLABUS_STATE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </template>
    </ClientFilterBar></CardContent></Card>

    <Table label="Seguimiento de la convocatoria">
      <TableHeader>
        <TableRow>
          <TableHead>Asignatura</TableHead>
          <TableHead>Paralelos y docentes</TableHead>
          <TableHead class="text-center">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="syllabusPage.length === 0" :colspan="3">
          {{ syllabusFilter.active.value ? 'Ningún expediente coincide con los filtros.' : 'Los expedientes aparecerán después de abrir la convocatoria.' }}
        </TableEmpty>
        <TableRow v-for="syllabus in syllabusPage" v-else :key="syllabus.id">
          <TableCell>
            <div>{{ syllabus.subject }}</div>
            <div class="text-sm text-muted-foreground">{{ syllabus.code }}</div>
          </TableCell>
          <TableCell>
            <div>{{ syllabus.parallels.length === 1 ? 'Paralelo' : 'Paralelos' }} {{ syllabus.parallels.join(', ') }}</div>
            <div class="text-sm text-muted-foreground">{{ syllabus.teachers.join(', ') }}</div>
          </TableCell>
          <TableCell class="text-center"><SyllabusStateBadge :state="syllabus.state" /></TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <TablePagination :meta="syllabusMeta" label="Paginación del seguimiento de convocatoria" @update:page="setSyllabusPage" />
  </div>
</template>
