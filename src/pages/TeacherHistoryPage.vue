<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherHistory, type HistoryCareer } from '@/api/syllabi';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { activateRow } from '@/lib/rowActivation';
import { paths } from '@/lib/routes';

const router = useRouter();
const careers = ref<HistoryCareer[] | null>(null);
const error = ref<string | null>(null);
const loading = computed(() => careers.value === null && error.value === null);

const load = async (): Promise<void> => {
  error.value = null;
  try { careers.value = (await getTeacherHistory()).careers; }
  catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar su historial.';
  }
};
const open = (career: HistoryCareer): void => { void router.push(paths.teacher.historyCareer(career.id)); };
onMounted(load);
</script>

<template>
  <PageFrame title="Historial" description="Sílabos de períodos anteriores de esta carrera." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="table-body" :columns="2" :actions="false" :pagination="false" />
    <template v-else-if="careers">
      <Table label="Carreras con historial">
        <TableHeader><TableRow><TableHead>Carrera</TableHead><TableHead class="text-center">Sílabos</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="careers.length === 0" :colspan="2">Todavía no tiene sílabos de períodos anteriores.</TableEmpty>
          <TableRow v-for="career in careers" v-else :key="career.id" class="cursor-pointer" tabindex="0" :aria-label="`Ver el historial de ${career.name}`" @click="activateRow($event, () => open(career))" @keydown.enter.self.prevent="open(career)" @keydown.space.self.prevent="open(career)">
            <TableCell>{{ career.name }}</TableCell>
            <TableCell class="text-center">{{ career.syllabi_count }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </template>
  </PageFrame>
</template>
