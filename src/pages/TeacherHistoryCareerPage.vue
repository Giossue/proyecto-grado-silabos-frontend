<script setup lang="ts">
import SyllabusStateBadge from '@/components/domain/SyllabusStateBadge.vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherHistoryCareer, type HistorySyllabus } from '@/api/syllabi';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { activateRow } from '@/lib/rowActivation';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const careerName = ref<string | null>(null);
const syllabi = ref<HistorySyllabus[] | null>(null);
const error = ref<string | null>(null);
const loading = computed(() => syllabi.value === null && error.value === null);
const groups = computed(() => {
  const byPeriod = new Map<string, HistorySyllabus[]>();
  for (const syllabus of syllabi.value ?? []) byPeriod.set(syllabus.period, [...(byPeriod.get(syllabus.period) ?? []), syllabus]);

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
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el historial de la carrera.';
  }
};
const formatSavedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin guardados';
const open = (id: string): void => { void router.push(paths.teacher.syllabus(id)); };
onMounted(load);
</script>

<template>
  <PageFrame title="Historial" description="Sílabos de períodos anteriores de esta carrera." size="wide">
    <template v-if="careerName" #meta><span class="text-sm font-semibold">{{ careerName }}</span></template>
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="table-body" :columns="4" :rows="3" :actions="false" :pagination="false" />
    <template v-else>
      <div v-for="group in groups" :key="group.period" class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold">Período {{ group.period }}</h2>
        <Table :label="`Sílabos del período ${group.period}`">
          <TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Paralelos</TableHead><TableHead class="text-center">Estado</TableHead><TableHead>Último guardado</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="syllabus in group.items" :key="syllabus.id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir sílabo de ${syllabus.subject}`" @click="activateRow($event, () => open(syllabus.id))" @keydown.enter.self.prevent="open(syllabus.id)" @keydown.space.self.prevent="open(syllabus.id)">
              <TableCell>{{ syllabus.subject }}</TableCell>
              <TableCell>{{ syllabus.parallels.join(', ') }}</TableCell>
              <TableCell class="text-center"><SyllabusStateBadge :state="syllabus.state" /></TableCell>
              <TableCell>{{ formatSavedAt(syllabus.guardado_en) }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </PageFrame>
</template>
