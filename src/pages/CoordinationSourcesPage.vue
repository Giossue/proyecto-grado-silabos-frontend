<script setup lang="ts">
import { Inbox } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSources, type Source } from '@/api/sources';
import { getSession } from '@/api/session';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import ProcessLockAlert from '@/components/domain/ProcessLockAlert.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import AcademicSourceActions from '@/components/domain/configuration/AcademicSourceActions.vue';
import AcademicSourceCreationSheet from '@/components/domain/configuration/AcademicSourceCreationSheet.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const sources = ref<Source[]>([]);
const loading = ref(true);
const lock = ref<string | null | undefined>();
const error = ref<string | null>(null);
const editingLocked = computed(() => loading.value || lock.value !== null);

const filter = useClientFilter(() => sources.value, (item) => [item.name, item.description ?? '']);
const filteredSources = computed(() => filter.items.value);
const { items: sourcePage, meta: sourceMeta, setPage: setSourcePage } = useClientPagination(filteredSources);

const load = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  lock.value = undefined;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    const response = await getSources();
    sources.value = response.sources;
    lock.value = response.processLock;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar las fuentes.';
  } finally { loading.value = false; }
};
const created = async (sourceId: string): Promise<void> => {
  await router.push(paths.coordination.source(sourceId));
};
const changed = async (value: string): Promise<void> => {
  toast.success(value);
  await load();
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Fuentes académicas" description="Los documentos que la coordinación entrega a los docentes como apoyo para elaborar sus sílabos.">
    <template #actions><AcademicSourceCreationSheet :disabled="editingLocked" @created="created" @failed="load" /></template>
    <ProcessLockAlert v-if="lock" />
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-if="loading && sources.length === 0" variant="cards" />
    <div v-else class="flex min-w-0 flex-col gap-4">
      <ClientFilterBar :filter="filter" input-id="sources-search" label="Buscar fuente" placeholder="Buscar por nombre o descripción" />
      <div aria-live="polite">
        <Empty v-if="sourcePage.length === 0" class="min-h-52">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>{{ filter.active.value ? 'Ninguna fuente coincide con la búsqueda.' : 'No existen fuentes.' }}</EmptyTitle>
          </EmptyHeader>
        </Empty>
        <div v-else class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card v-for="source in sourcePage" :key="source.id" class="h-full min-w-0">
            <CardHeader>
              <CardTitle class="min-w-0 break-words">{{ source.name }}</CardTitle>
              <CardAction><AcademicSourceActions :source="source" :locked="editingLocked" @changed="changed" /></CardAction>
            </CardHeader>
            <CardContent class="min-w-0 flex-1">
              <p class="line-clamp-3 break-words text-sm text-muted-foreground">{{ source.description || 'Sin descripción.' }}</p>
            </CardContent>
            <CardFooter>
              <Badge :variant="source.has_content ? 'secondary' : 'outline'">{{ source.has_content ? 'Contenido disponible' : 'Sin contenido' }}</Badge>
            </CardFooter>
          </Card>
        </div>
      </div>
      <TablePagination :meta="sourceMeta" label="Paginación de fuentes académicas" @update:page="setSourcePage" />
    </div>
  </PageFrame>
</template>
