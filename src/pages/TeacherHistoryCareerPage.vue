<script setup lang="ts">
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherHistoryCareer, type HistorySyllabus } from '@/api/syllabi';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { useClientPagination } from '@/composables/useClientPagination';
import { Skeleton } from '@/components/ui/skeleton';
import TableCardLine from '@/components/domain/TableCardLine.vue';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { activateRow } from '@/lib/rowActivation';
import { paths } from '@/lib/routes';
import { ArrowLeft } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { goBack } from '@/lib/goBack';

const route = useRoute();
const router = useRouter();
const careerName = ref<string | null>(null);
const syllabi = ref<HistorySyllabus[] | null>(null);
const error = ref<string | null>(null);
const loading = computed(() => syllabi.value === null && error.value === null);
// Se pagina la lista completa y la página se agrupa por período: una sola paginación para todos los grupos.
const { items: pagedSyllabi, meta, setPage } = useClientPagination(() => syllabi.value ?? [], 20);
const groups = computed(() => {
  const byPeriod = new Map<string, HistorySyllabus[]>();
  for (const syllabus of pagedSyllabi.value) byPeriod.set(syllabus.period, [...(byPeriod.get(syllabus.period) ?? []), syllabus]);

  return [...byPeriod.entries()].map(([period, items]) => ({ period, items }));
});

const load = async (): Promise<void> => {
  error.value = null;
  try {
    const result = await getTeacherHistoryCareer(String(route.params.career));
    careerName.value = result.career.name;
    syllabi.value = result.syllabi;
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    if (reason instanceof ApiError && reason.status === 404) { await router.replace(paths.teacher.history); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el historial de la carrera';
  }
};
const formatSavedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin guardados';
const open = (id: string): void => { void router.push({ path: paths.teacher.syllabus(id), state: { syllabusPreview: true } }); };
onMounted(load);
</script>

<template>
  <PageFrame title="Historial" description="Sílabos de períodos anteriores de esta carrera" size="wide" :loading="loading">
    <template #eyebrow><Button type="button" variant="link" size="sm" class="h-auto px-0" @click="goBack(router, paths.teacher.history)"><ArrowLeft aria-hidden="true" />Volver al historial</Button></template>
    <template v-if="careerName || loading" #meta><Skeleton v-if="loading" class="h-5 w-40" /><span v-else class="text-sm font-semibold">{{ careerName }}</span></template>
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="table-body" :columns="4" :rows="3" :actions="false" :badges="[3]" heading />
    <template v-else>
      <div v-for="group in groups" :key="group.period" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold">Período {{ group.period }}</h2>
        <Table :label="`Sílabos del período ${group.period}`">
          <TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Paralelos</TableHead><TableHead class="text-center">Estado</TableHead><TableHead>Último guardado</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="syllabus in group.items" :key="syllabus.id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir sílabo de ${syllabus.subject}`" @click="activateRow($event, () => open(syllabus.id))" @keydown.enter.self.prevent="open(syllabus.id)" @keydown.space.self.prevent="open(syllabus.id)">
              <TableCell>{{ syllabus.subject }}<TableCardLine>{{ syllabus.parallels.length === 1 ? 'Paralelo' : 'Paralelos' }} {{ syllabus.parallels.join(', ') }} · {{ formatSavedAt(syllabus.guardado_en) }}</TableCardLine><TableCardLine><SyllabusStateBadge :state="syllabus.state" /></TableCardLine></TableCell>
              <TableCell data-card-hide="true">{{ syllabus.parallels.join(', ') }}</TableCell>
              <TableCell class="text-center" data-card-hide="true"><SyllabusStateBadge :state="syllabus.state" /></TableCell>
              <TableCell data-card-hide="true">{{ formatSavedAt(syllabus.guardado_en) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Table v-if="groups.length === 0" label="Sílabos de la carrera">
        <TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Paralelos</TableHead><TableHead class="text-center">Estado</TableHead><TableHead>Último guardado</TableHead></TableRow></TableHeader>
        <TableBody><TableEmpty :colspan="4">Todavía no tiene sílabos de períodos anteriores en esta carrera</TableEmpty></TableBody>
      </Table>
      <TablePagination :meta="meta" label="Paginación del historial de la carrera" @update:page="setPage" />
    </template>
  </PageFrame>
</template>
