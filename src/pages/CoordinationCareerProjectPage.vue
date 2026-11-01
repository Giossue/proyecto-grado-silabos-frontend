<script setup lang="ts">
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getScheduledSubjects, type ScheduledSubjects } from '@/api/career-academics';
import { getSession } from '@/api/session';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import SubjectProfileSheet from '@/components/domain/academic/SubjectProfileSheet.vue';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { ChevronDown } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientFilter } from '@/composables/useClientFilter';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';

type Subject = ScheduledSubjects['options']['activeSubjects'][number];

const router = useRouter();
const data = ref<ScheduledSubjects | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const selected = ref<Subject | null>(null);
const profileOpen = ref(false);

const load = async (): Promise<void> => {
    loading.value = true;
    loadError.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'coordinador' || !session.active_role.career_id) {
            await router.replace(paths.dashboard);
            return;
        }
        data.value = await getScheduledSubjects();
    } catch (reason) {
        loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el proyecto de carrera';
    } finally {
        loading.value = false;
    }
};

const subjects = computed<Subject[]>(() => (data.value?.options.activeSubjects ?? []).filter((subject) => subject.generates_syllabus !== false));
const statusOf = (subject: Subject): string => (subject.profile_complete
    ? 'Completa'
    : subject.profile_total ? `${subject.profile_filled ?? 0} de ${subject.profile_total} campos` : 'Incompleta');
const cycleLabel = (subject: Subject): string => (subject.ciclo ? String(subject.ciclo) : 'Sin ciclo');
const filter = useClientFilter(() => subjects.value, (subject) => [subject.nombre], {
    ciclo: { matches: (subject, value) => cycleLabel(subject) === value },
    estado: { matches: (subject, value) => (value === 'complete' ? Boolean(subject.profile_complete) : !subject.profile_complete) },
});
const cycleOptions = computed(() => [...new Set(subjects.value.map(cycleLabel))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })));
const groups = computed(() => {
    const byCycle = new Map<string, Subject[]>();
    for (const subject of filter.items.value) byCycle.set(cycleLabel(subject), [...(byCycle.get(cycleLabel(subject)) ?? []), subject]);
    return [...byCycle].sort(([a], [b]) => a.localeCompare(b, 'es', { numeric: true })).map(([cycle, list]) => ({ cycle, list }));
});
const completeCount = (list: Subject[]): number => list.filter((subject) => subject.profile_complete).length;
const open = (subject: Subject): void => {
    selected.value = subject;
    profileOpen.value = true;
};
const saved = async (message = 'Proyecto de carrera guardado'): Promise<void> => {
    toast.success(message);
    await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Proyecto de carrera" description="Datos de cada materia que heredan los sílabos" size="wide" :loading="!data">
    <template v-if="data?.career.lock_reason" #banner><ProcessLockAlert banner :lock="data.career.lock" /></template>
    <template #actions><FichaImportDialog :disabled="Boolean(data?.career.lock_reason)" @applied="saved" /></template>
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="accordion" :rows="3" :filters="2" />
    <div v-else-if="data" class="flex flex-col gap-4"><Card class="py-3"><CardContent class="px-3">
      <ClientFilterBar :filter="filter" input-id="career-project-search" label="Buscar por materia" placeholder="Buscar por materia">
        <template #filters>
          <Field><FieldLabel for="career-project-cycle" class="sr-only">Ciclo</FieldLabel>
            <Select v-model="filter.values.ciclo.value"><SelectTrigger id="career-project-cycle"><SelectValue placeholder="Todos los ciclos" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todos los ciclos</SelectItem><SelectItem v-for="option in cycleOptions" :key="option" :value="option">{{ option }}</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field><FieldLabel for="career-project-state" class="sr-only">Estado del proyecto de carrera</FieldLabel>
            <Select v-model="filter.values.estado.value"><SelectTrigger id="career-project-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="complete">Completas</SelectItem><SelectItem value="incomplete">Incompletas</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </template>
      </ClientFilterBar>
      </CardContent></Card>
      <div class="flex flex-col gap-2">
        <p v-if="!groups.length" class="py-6 text-center text-sm text-muted-foreground">{{ filter.active.value ? 'Ninguna materia coincide con la búsqueda' : 'La malla todavía no tiene materias' }}</p>
        <Collapsible v-for="group in groups" :key="`${group.cycle}-${filter.active.value}`" :default-open="filter.active.value" class="group/cycle rounded-md ring-1 ring-surface-ring bg-card">
          <CollapsibleTrigger class="flex w-full items-center gap-2 px-4 py-3 text-left font-semibold">
            <span class="flex-1">{{ group.cycle === 'Sin ciclo' ? group.cycle : `Ciclo ${group.cycle}` }}</span>
            <Badge :variant="completeCount(group.list) === group.list.length ? 'success' : 'warning'" :aria-label="`${completeCount(group.list)} de ${group.list.length} asignaturas completas`">{{ completeCount(group.list) }}/{{ group.list.length }}</Badge>
            <ChevronDown class="size-4 transition-transform group-data-[state=open]/cycle:rotate-180" aria-hidden="true" />
          </CollapsibleTrigger>
          <CollapsibleContent class="border-t bg-muted/60 p-3">
            <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :aria-label="group.cycle === 'Sin ciclo' ? 'Materias sin ciclo' : `Materias del ciclo ${group.cycle}`">
              <li v-for="subject in group.list" :key="subject.id">
                <Card
                  class="h-full cursor-pointer transition-colors hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-hidden"
                  tabindex="0"
                  :aria-label="`Abrir el proyecto de carrera de ${subject.nombre}`"
                  @click="open(subject)"
                  @keydown.enter.self.prevent="open(subject)"
                  @keydown.space.self.prevent="open(subject)"
                >
                  <CardHeader>
                    <CardTitle>{{ subject.nombre }}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatusBadge :label="statusOf(subject)" :tone="subject.profile_complete ? 'success' : 'warning'" />
                  </CardContent>
                </Card>
              </li>
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
    <SubjectProfileSheet v-if="selected" v-model:open="profileOpen" :subject-id="selected.id" :subject-name="selected.nombre" :disabled="Boolean(data?.career.lock_reason)" @saved="saved" />
  </PageFrame>
</template>
