<script setup lang="ts">
import EmptyState from '@/components/domain/EmptyState.vue';
import StatusBadge from '@/components/domain/StatusBadge.vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getScheduledSubjects, type ScheduledSubjects } from '@/api/career-academics';
import { getSession } from '@/api/session';
import FichaImportDialog from '@/components/domain/academic/FichaImportDialog.vue';
import SubjectProfileDialog from '@/components/domain/academic/SubjectProfileDialog.vue';
import SupportDocumentsPanel from '@/components/domain/academic/SupportDocumentsPanel.vue';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import { BookOpen, ChevronDown, FileText, Plus } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientFilter } from '@/composables/useClientFilter';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';

type Subject = ScheduledSubjects['options']['activeSubjects'][number];

const router = useRouter();
const route = useRoute();
const tab = ref(route.query.tab === 'documentos' ? 'documentos' : 'materias');
const uploadOpen = ref(false);
watch(tab, (value) => { void router.replace({ query: { ...route.query, tab: value === 'documentos' ? 'documentos' : undefined } }); });
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
  <PageFrame :title="tab === 'documentos' ? 'Documentos de apoyo' : 'Proyecto de carrera por materia'" :description="tab === 'documentos' ? 'Material de la carrera que sus docentes pueden consultar' : 'Contenido de cada materia que se copia en sus sílabos'" size="wide" :loading="!data && !loadError" :actions-skeleton="!data && !loadError ? [tab === 'documentos' ? 'w-40' : 'w-44'] : []">
    <template v-if="data?.career.lock_reason && tab !== 'documentos'" #banner><ProcessLockAlert banner :lock="data.career.lock" /></template>
    <template #actions>
      <Button v-if="tab === 'documentos'" type="button" @click="uploadOpen = true"><Plus data-icon="inline-start" aria-hidden="true" />Subir documento</Button>
      <FichaImportDialog v-else :disabled="Boolean(data?.career.lock_reason)" @applied="saved" />
    </template>
    <Tabs v-model="tab" class="gap-4">
      <div v-if="!data && !loadError" data-skeleton="table-tabs" class="flex h-11 items-center gap-2" aria-hidden="true">
        <div v-for="width in ['w-16', 'w-36']" :key="width" class="flex h-full items-center gap-2 px-4"><Skeleton class="size-4" /><Skeleton :class="cn('h-4', width)" /></div>
      </div>
      <TabsList v-else class="h-11 justify-start" aria-label="Vistas del proyecto de carrera">
        <TabsTrigger value="materias" class="flex-none gap-2 px-4 data-[state=active]:font-semibold"><BookOpen aria-hidden="true" />Materias</TabsTrigger>
        <TabsTrigger value="documentos" class="flex-none gap-2 px-4 data-[state=active]:font-semibold"><FileText aria-hidden="true" />Documentos de apoyo</TabsTrigger>
      </TabsList>
      <TabsContent value="materias" class="flex flex-col gap-4">
        <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
        <LoadingSkeleton v-else-if="loading && !data" variant="accordion" :rows="3" :filters="2" />
        <div v-else-if="data" class="flex flex-col gap-4">
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
          
          <div data-tour="career-subjects" class="flex flex-col gap-2">
            <EmptyState v-if="!groups.length" :title="filter.active.value ? 'Ninguna materia coincide con la búsqueda' : 'La malla todavía no tiene materias'" />
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
      </TabsContent>
      <TabsContent value="documentos" class="flex flex-col gap-4">
        <SupportDocumentsPanel v-model:upload-open="uploadOpen" :manages="true" />
      </TabsContent>
    </Tabs>
    <SubjectProfileDialog v-if="selected" v-model:open="profileOpen" :subject-id="selected.id" :subject-name="selected.nombre" :disabled="Boolean(data?.career.lock_reason)" @saved="saved" />
  </PageFrame>
</template>
