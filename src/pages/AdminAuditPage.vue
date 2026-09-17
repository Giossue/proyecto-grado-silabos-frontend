<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getAuditEvents, type AuditPayload } from '@/api/operations';
import { getSession } from '@/api/session';
import DatePicker from '@/components/DatePicker.vue';
import AuditTabs from '@/components/domain/AuditTabs.vue';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const router = useRouter();
const data = ref<AuditPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const filters = reactive({ search: '', action: 'all', result: 'all', from: '', to: '' });

const load = async (page = 1): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') {
      await router.replace('/dashboard');
      return;
    }
    data.value = await getAuditEvents({
      search: filters.search,
      action: filters.action === 'all' ? '' : filters.action,
      result: filters.result === 'all' ? '' : filters.result,
      from: filters.from,
      to: filters.to,
      page: String(page),
    });
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la auditoría.';
  } finally {
    loading.value = false;
  }
};

const clearFilters = (): void => {
  Object.assign(filters, { search: '', action: 'all', result: 'all', from: '', to: '' });
  void load();
};
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));
const detailValue = (value: string | number | boolean): string => typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value);

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Auditoría" description="Quién hizo qué y cuándo. Se escribe solo, no se puede cambiar ni borrar, y no guarda lo que dicen los sílabos.">
    <AuditTabs active="activity">
      <Card>
        <CardContent class="flex flex-col gap-4">
          <form @submit.prevent="load()">
            <FilterToolbar @clear="clearFilters">
              <template #search><Field><FieldLabel for="audit-search" class="sr-only">Buscar actor o acción</FieldLabel><Input id="audit-search" v-model="filters.search" type="search" placeholder="Buscar actor o acción" /></Field></template>
              <template #filters>
                <Field><FieldLabel for="audit-action" class="sr-only">Acción</FieldLabel><Select v-model="filters.action"><SelectTrigger id="audit-action"><SelectValue placeholder="Todas las acciones" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las acciones</SelectItem><SelectItem v-for="option in data?.action_options" :key="option.value" :value="option.value">{{ option.label }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                <Field><FieldLabel for="audit-result" class="sr-only">Resultado</FieldLabel><Select v-model="filters.result"><SelectTrigger id="audit-result"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los resultados</SelectItem><SelectItem value="exito">Correcto</SelectItem><SelectItem value="fallido">Fallido</SelectItem></SelectGroup></SelectContent></Select></Field>
                <div class="grid grid-cols-2 gap-3 max-[340px]:grid-cols-1 sm:contents"><Field class="min-w-0 lg:w-44"><FieldLabel for="audit-from" class="text-xs text-muted-foreground">Fecha inicial</FieldLabel><DatePicker id="audit-from" v-model="filters.from" /></Field><Field class="min-w-0 lg:w-44"><FieldLabel for="audit-to" class="text-xs text-muted-foreground">Fecha final</FieldLabel><DatePicker id="audit-to" v-model="filters.to" /></Field></div>
              </template>
            </FilterToolbar>
          </form>
          <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
          <LoadingSkeleton v-if="loading && !data" />
          <template v-if="data">
            <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Actor y rol</TableHead><TableHead>Acción</TableHead><TableHead>Recurso</TableHead><TableHead>Resultado</TableHead><TableHead>Detalles seguros</TableHead></TableRow></TableHeader><TableBody>
              <TableRow v-for="event in data.events.data" :key="event.id"><TableCell class="text-xs whitespace-nowrap">{{ formatDate(event.occurred_at) }}</TableCell><TableCell><div>{{ event.actor }}</div><div class="text-xs text-muted-foreground">{{ [event.role, event.career].filter(Boolean).join(' · ') || 'Proceso del sistema' }}</div></TableCell><TableCell>{{ event.action }}</TableCell><TableCell>{{ event.resource }}</TableCell><TableCell><span :class="event.result === 'fallido' ? 'text-destructive' : ''">{{ event.result === 'fallido' ? 'Fallido' : 'Correcto' }}</span></TableCell><TableCell class="max-w-md"><dl v-if="event.details.length" class="flex flex-col gap-1 text-xs"><div v-for="detail in event.details" :key="detail.label" class="flex gap-1"><dt class="font-medium">{{ detail.label }}:</dt><dd class="break-words">{{ detailValue(detail.value) }}</dd></div></dl><span v-else class="text-xs text-muted-foreground">Sin detalles adicionales</span></TableCell></TableRow>
              <TableEmpty v-if="data.events.data.length === 0" :colspan="6">No hay eventos para los filtros actuales.</TableEmpty>
            </TableBody></Table>
            <TablePagination :meta="data.events" label="Paginación de eventos de auditoría" @update:page="load" />
          </template>
        </CardContent>
      </Card>
    </AuditTabs>
  </PageFrame>
</template>
