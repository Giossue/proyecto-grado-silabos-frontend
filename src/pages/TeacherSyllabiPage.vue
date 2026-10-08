<script setup lang="ts">
import { syllabusStateLabel } from '@/lib/syllabusStates';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getTeacherSyllabi, type SyllabiResponse } from '@/api/syllabi';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { paths } from '@/lib/routes';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const router = useRouter();
const result = ref<SyllabiResponse | null>(null);
const error = ref<string | null>(null);

const load = async (): Promise<void> => {
  error.value = null;
  try { result.value = await getTeacherSyllabi(); }
  catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) { await router.replace(paths.login); return; }
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar sus sílabos.';
  }
};
const formatSavedAt = (value: string | null): string => value ? formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin guardados';
const periods = computed(() => [...new Set((result.value?.syllabi.data ?? []).map((syllabus) => syllabus.period))]);
const openSyllabus = (id: string): void => { void router.push(paths.teacher.syllabus(id)); };
onMounted(load);
</script>

<template>
  <PageFrame :title="periods.length === 1 ? `Sílabos - Período ${periods[0]}` : 'Mis sílabos'" description="Los sílabos de las materias que usted dicta." size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <div v-else-if="!result" class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
      <Skeleton v-for="index in 2" :key="index" class="h-32 rounded-xl" />
    </div>
    <p v-else-if="result.syllabi.data.length === 0" class="text-sm text-muted-foreground">No tiene sílabos asignados con este rol.</p>
    <ul v-else class="grid gap-4 sm:grid-cols-2" aria-label="Mis sílabos">
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
            <div class="flex flex-wrap gap-1.5"><Badge v-for="parallel in syllabus.parallels" :key="parallel" variant="outline">{{ parallel }}</Badge></div>
          </CardHeader>
          <CardContent class="flex flex-col gap-1 text-sm">
            <span class="font-semibold">{{ syllabusStateLabel(syllabus.state) ?? 'Estado no disponible' }}</span>
            <span class="text-muted-foreground">{{ formatSavedAt(syllabus.guardado_en) }}</span>
          </CardContent>
        </Card>
      </li>
    </ul>
  </PageFrame>
</template>
