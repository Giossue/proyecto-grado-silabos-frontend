<script setup lang="ts">
import { formatDateDisplay } from '@/lib/dateDisplay';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getAuditEvents, type AuditPayload } from '@/api/operations';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paths } from '@/lib/routes';
import { latestRequest } from '@/lib/latestRequest';
import { queryPage, queryText, syncFilters } from '@/lib/urlFilters';

type Option = { value: string; label: string };

const route = useRoute();
const router = useRouter();
const data = ref<AuditPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const filters = reactive({
  period: queryText(route.query.period) || 'all',
  role: queryText(route.query.role) || 'all',
  career: queryText(route.query.career) || 'all',
  action: queryText(route.query.action) || 'all',
  result: queryText(route.query.result) || 'all',
});
const filtersActive = computed(() => Object.values(filters).some((value) => value !== 'all'));
const requests = latestRequest();
const RESULTS: Option[] = [{ value: 'exito', label: 'Exitoso' }, { value: 'fallido', label: 'Fallido' }];

const load = async (page = 1): Promise<void> => {
  const ticket = requests.begin();
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (!requests.isCurrent(ticket)) return;
    if (session.active_role?.code !== 'administrador') {
      await router.replace(paths.dashboard);
      return;
    }
    const applied = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== 'all'));
    const response = await getAuditEvents({ ...applied, page: String(page) });
    if (!requests.isCurrent(ticket)) return;
    data.value = response;
    syncFilters(router, filters, page);
  } catch (reason) {
    if (requests.isCurrent(ticket)) error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la auditoría';
  } finally {
    if (requests.isCurrent(ticket)) loading.value = false;
  }
};
const clearFilters = (): void => {
  Object.assign(filters, { period: 'all', role: 'all', career: 'all', action: 'all', result: 'all' });
  void load();
};

const formatDate = (value: string): string => formatDateDisplay(value, { dateStyle: 'medium', timeStyle: 'medium' });

onMounted(() => { void load(queryPage(route.query.page)); });
</script>

<template>
  <PageFrame title="Auditoría" description="Registro de las acciones realizadas en el sistema" size="wide">
    <LoadErrorState v-if="error" :message="error" @retry="load()" />
    <LoadingSkeleton v-if="loading && !data && !error" variant="table" :columns="3" :search="false" :filters="5" :actions="false" :cell-lines="[1, 2, 2]" :widths="['minmax(0, 1fr)', 'minmax(0, 2fr)', 'minmax(0, 1.5fr)']" />
    <div v-if="data" class="flex flex-col gap-4">
      <Card class="py-3"><CardContent class="px-3">
        <form @submit.prevent="load()">
          <FilterToolbar :active="filtersActive" @clear="clearFilters">
            <template #filters>
              <Field v-for="filter in ([
                { key: 'period', label: 'Período', all: 'Todos los períodos', options: data.period_options },
                { key: 'role', label: 'Rol', all: 'Todos los roles', options: data.role_options },
                { key: 'career', label: 'Carrera', all: 'Todas las carreras', options: data.career_options },
                { key: 'action', label: 'Actividad', all: 'Todas las actividades', options: data.action_options },
                { key: 'result', label: 'Resultado', all: 'Todos los resultados', options: RESULTS },
              ] as const)" :key="filter.key">
                <FieldLabel :for="`audit-${filter.key}`" class="sr-only">{{ filter.label }}</FieldLabel>
                <Select v-model="filters[filter.key]" :name="filter.key">
                  <SelectTrigger :id="`audit-${filter.key}`"><SelectValue :placeholder="filter.all" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">{{ filter.all }}</SelectItem>
                      <SelectItem v-for="option in filter.options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </template>
          </FilterToolbar>
        </form>
      </CardContent></Card>
      <Table label="Registro de auditoría">
        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Actividad</TableHead><TableHead>Responsable</TableHead></TableRow></TableHeader>
        <TableBody>
          <TableRow v-for="event in data.events.data" :key="event.id">
            <TableCell class="whitespace-nowrap">{{ formatDate(event.occurred_at) }}</TableCell>
            <TableCell><div>{{ event.action }}</div><div class="text-sm text-muted-foreground">{{ event.resource }}</div></TableCell>
            <TableCell><div>{{ event.actor }}</div><div v-if="event.role || event.career" class="text-sm text-muted-foreground">{{ [event.role, event.career].filter(Boolean).join(' · ') }}</div></TableCell>
          </TableRow>
          <TableEmpty v-if="data.events.data.length === 0" :colspan="3">{{ Object.values(filters).some((value) => value !== 'all') ? 'No hay actividad para los filtros seleccionados' : 'Todavía no hay actividad registrada' }}</TableEmpty>
        </TableBody>
      </Table>
      <TablePagination :meta="data.events" label="Paginación del registro de auditoría" @update:page="load" />
    </div>
  </PageFrame>
</template>
