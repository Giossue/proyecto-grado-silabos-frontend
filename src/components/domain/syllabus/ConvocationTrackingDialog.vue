<script setup lang="ts">
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { SYLLABUS_STATE_OPTIONS } from '@/lib/syllabusStates';
import { ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import { getConvocation, type ConvocationDetail } from '@/api/convocations';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';

const props = defineProps<{ open: boolean; convocationId: string }>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const data = ref<ConvocationDetail | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const formatDate = (value: string | null): string => value
  ? formatDateDisplay(value, { dateStyle: 'long' })
  : 'Sin fecha';
const formatStartedAt = (value: string | null): string => value
  ? formatDateDisplay(value, { dateStyle: 'medium' })
  : 'Sin iniciar';
const syllabusFilter = useClientFilter(
  () => data.value?.convocation.syllabi ?? [],
  (item) => [item.subject, item.code, item.state],
  { estado: { matches: (item, value) => item.state === value } },
);
const { items: syllabusPage, meta: syllabusMeta, setPage: setSyllabusPage } = useClientPagination(() => syllabusFilter.items.value);

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

watch(() => props.open, (open) => {
  if (open) void load();
}, { immediate: true });
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader class="px-6 pt-6">
        <DialogTitle>Seguimiento por expediente</DialogTitle>
        <DialogDescription>
          {{ data ? `Elaboración desde ${formatDate(data.convocation.start_date)} hasta ${formatDate(data.convocation.draft_deadline)}. Vencido el plazo, el envío se bloquea hasta que conceda una prórroga.` : 'Consulte el avance de los expedientes de esta convocatoria.' }}
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 pt-1 pb-6">
        <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-else-if="loading && !data" variant="table-body" :columns="4" :search="true" :filters="1" :actions="false" :cell-lines="2" />
        <div v-else-if="data" class="flex flex-col gap-4">
          <ClientFilterBar
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
          </ClientFilterBar>

          <div class="overflow-x-auto">
            <Table label="Seguimiento de la convocatoria">
              <TableHeader>
                <TableRow>
                  <TableHead>Asignatura</TableHead>
                  <TableHead>Paralelos y docentes</TableHead>

                  <TableHead class="text-center">Estado</TableHead>
                  <TableHead>Iniciado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableEmpty v-if="syllabusPage.length === 0" :colspan="4">
                  {{ syllabusFilter.active.value ? 'Ningún expediente coincide con los filtros.' : 'Los expedientes aparecerán después de abrir la convocatoria.' }}
                </TableEmpty>
                <TableRow v-for="syllabus in syllabusPage" v-else :key="syllabus.id">
                  <TableCell>
                    <div>{{ syllabus.subject }}</div>
                    <div class="text-sm text-muted-foreground">{{ syllabus.code }}</div>
                  </TableCell>
                  <TableCell>
                    <div>Paralelos {{ syllabus.parallels.join(', ') }}</div>
                    <div class="text-sm text-muted-foreground">{{ syllabus.teachers.join(', ') }}</div>
                  </TableCell>
                  <TableCell class="text-center"><SyllabusStateBadge :state="syllabus.state" /></TableCell>
                  <TableCell>{{ formatStartedAt(syllabus.iniciado_en) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <TablePagination :meta="syllabusMeta" label="Paginación del seguimiento de convocatoria" @update:page="setSyllabusPage" />
        </div>
      </div>
      <DialogFooter class="px-6 pb-6">
        <DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
