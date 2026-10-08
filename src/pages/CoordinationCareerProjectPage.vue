<script setup lang="ts">
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
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { activateRow } from '@/lib/rowActivation';
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
        loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el proyecto de carrera.';
    } finally {
        loading.value = false;
    }
};

const subjects = computed<Subject[]>(() => data.value?.options.activeSubjects ?? []);
const statusOf = (subject: Subject): string => (subject.profile_complete ? 'Completa' : 'Incompleta');
const cycleLabel = (subject: Subject): string => (subject.ciclo ? `${subject.ciclo}.º` : 'Sin ciclo');
const filter = useClientFilter(() => subjects.value, (subject) => [subject.nombre, subject.codigo_asignatura, statusOf(subject), cycleLabel(subject)], {
    estado: { matches: (subject, value) => (value === 'complete' ? Boolean(subject.profile_complete) : !subject.profile_complete) },
});
const { items, meta, setPage } = useClientPagination(() => filter.items.value);
const open = (subject: Subject): void => {
    selected.value = subject;
    profileOpen.value = true;
};
const saved = async (message = 'Ficha de asignatura guardada.'): Promise<void> => {
    toast.success(message);
    await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Proyecto de carrera" description="Datos de cada materia que heredan los sílabos.">
    <template #actions><FichaImportDialog :disabled="!data || Boolean(data.career.lock_reason)" @applied="saved" /></template>
    <ProcessLockAlert v-if="data?.career.lock_reason" />
    <LoadErrorState v-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" :filters="1" :actions="false" />
    <Card v-else-if="data"><CardContent class="flex flex-col gap-4">
      <ClientFilterBar :filter="filter" input-id="career-project-search" label="Buscar por materia, código o ciclo" placeholder="Buscar por materia, código o ciclo">
        <template #filters>
          <Field><FieldLabel for="career-project-state" class="sr-only">Estado de la ficha</FieldLabel>
            <Select v-model="filter.values.estado.value"><SelectTrigger id="career-project-state"><SelectValue placeholder="Todas las fichas" /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem value="all">Todas las fichas</SelectItem><SelectItem value="complete">Completas</SelectItem><SelectItem value="incomplete">Incompletas</SelectItem></SelectGroup></SelectContent>
            </Select>
          </Field>
        </template>
      </ClientFilterBar>
      <Table label="Materias de la malla">
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Código</TableHead><TableHead>Ciclo</TableHead><TableHead>Ficha</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableEmpty v-if="!items.length" :colspan="4">{{ filter.active.value ? 'Ninguna materia coincide con la búsqueda.' : 'La malla todavía no tiene materias.' }}</TableEmpty>
          <TableRow v-for="subject in items" v-else :key="subject.id" class="cursor-pointer" tabindex="0" :aria-label="`Abrir la ficha de ${subject.nombre}`" @click="activateRow($event, () => open(subject))" @keydown.enter.self.prevent="open(subject)" @keydown.space.self.prevent="open(subject)">
            <TableCell>{{ subject.nombre }}</TableCell>
            <TableCell>{{ subject.codigo_asignatura }}</TableCell>
            <TableCell>{{ cycleLabel(subject) }}</TableCell>
            <TableCell :class="subject.profile_complete ? '' : 'text-muted-foreground'">{{ statusOf(subject) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination :meta="meta" mode="client" label="Paginación de materias" @update:page="setPage" />
    </CardContent></Card>
    <SubjectProfileSheet v-if="selected" v-model:open="profileOpen" :subject-id="selected.id" :subject-name="selected.nombre" :disabled="Boolean(data?.career.lock_reason)" @saved="saved" />
  </PageFrame>
</template>
