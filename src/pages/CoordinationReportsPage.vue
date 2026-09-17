<script setup lang="ts">
import { Eye } from '@lucide/vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getOperationalReports, type ReportsPayload } from '@/api/operations';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientPagination } from '@/composables/useClientPagination';

const router = useRouter();
const data = ref<ReportsPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const filters = reactive({ search: '', state: 'all', convocation: 'all' });
const label = (value: string): string => ({ sin_iniciar: 'Sin iniciar', borrador: 'Borrador', en_revision: 'En revisión', correccion_solicitada: 'Corrección solicitada', aprobado: 'Aprobado' }[value] ?? 'Estado no disponible');
const breakdownValue = (item: Record<string, string | number>, key: string): string | number => item[key] ?? 0;
const { items: convocationPage, meta: convocationMeta, setPage: setConvocationPage } = useClientPagination(() => data.value?.convocation_breakdown ?? []);

const load = async (page = 1): Promise<void> => {
  loading.value = true; error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') { await router.replace('/panel'); return; }
    data.value = await getOperationalReports({ search: filters.search, state: filters.state === 'all' ? '' : filters.state, convocation: filters.convocation === 'all' ? '' : filters.convocation, page: String(page) });
  } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar el informe.'; }
  finally { loading.value = false; }
};
onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Informes de avance" description="Cómo va su carrera: cuántos sílabos faltan, cuántos están en revisión y cuántos aprobados.">
    <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
    <p v-if="loading && !data" class="text-sm text-muted-foreground" role="status">Cargando seguimiento…</p>
    <template v-if="data">
      <Card><CardHeader><CardTitle>Alcance del informe</CardTitle><CardDescription>Los filtros se conservan en la URL y se aplican tanto a los indicadores como al detalle.</CardDescription></CardHeader><CardContent><form @submit.prevent="load()"><FilterToolbar><template #search><Field><FieldLabel for="report-search" class="sr-only">Buscar asignatura o código</FieldLabel><Input id="report-search" v-model="filters.search" type="search" placeholder="Buscar asignatura o código" /></Field></template><template #filters><Field><FieldLabel for="report-convocation" class="sr-only">Convocatoria</FieldLabel><Select v-model="filters.convocation"><SelectTrigger id="report-convocation"><SelectValue placeholder="Todas las convocatorias" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las convocatorias</SelectItem><SelectItem v-for="item in data.convocations" :key="item.id" :value="item.id">{{ item.name }} · {{ item.period }}</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel for="report-state" class="sr-only">Estado</FieldLabel><Select v-model="filters.state"><SelectTrigger id="report-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="sin_iniciar">Sin iniciar</SelectItem><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="en_revision">En revisión</SelectItem><SelectItem value="correccion_solicitada">Corrección solicitada</SelectItem><SelectItem value="aprobado">Aprobado</SelectItem></SelectGroup></SelectContent></Select></Field></template><template #action><Button type="submit" variant="outline" :disabled="loading">Aplicar</Button></template></FilterToolbar></form></CardContent></Card>

      <Card><CardHeader><CardTitle>Distribución por convocatoria</CardTitle><CardDescription>Conteos bajo los mismos filtros y alcance de carrera.</CardDescription></CardHeader><CardContent class="flex flex-col gap-4"><Table><TableHeader><TableRow><TableHead>Convocatoria</TableHead><TableHead>Total</TableHead><TableHead>Sin iniciar</TableHead><TableHead>Borrador</TableHead><TableHead>En revisión</TableHead><TableHead>Corrección</TableHead><TableHead>Aprobado</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in convocationPage" :key="String(item.id)"><TableCell>{{ breakdownValue(item, 'name') }}</TableCell><TableCell>{{ breakdownValue(item, 'total') }}</TableCell><TableCell>{{ breakdownValue(item, 'not_started') }}</TableCell><TableCell>{{ breakdownValue(item, 'draft') }}</TableCell><TableCell>{{ breakdownValue(item, 'in_review') }}</TableCell><TableCell>{{ breakdownValue(item, 'correction_requested') }}</TableCell><TableCell>{{ breakdownValue(item, 'approved') }}</TableCell></TableRow><TableEmpty v-if="data.convocation_breakdown.length === 0" :colspan="7">No hay convocatorias con expedientes para los filtros actuales.</TableEmpty></TableBody></Table><TablePagination :meta="convocationMeta" mode="client" label="Paginación de distribución por convocatoria" @update:page="setConvocationPage" /></CardContent></Card>

      <Card><CardHeader><CardTitle>Detalle de expedientes</CardTitle><CardDescription>{{ data.syllabi.total }} resultado(s), paginados sin ampliar el alcance.</CardDescription></CardHeader><CardContent class="flex flex-col gap-4"><Table><TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Convocatoria</TableHead><TableHead>Docentes</TableHead><TableHead>Estado</TableHead><TableHead>Completitud</TableHead><TableHead>Observaciones</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody><TableRow v-for="item in data.syllabi.data" :key="item.id"><TableCell><div>{{ item.subject }}</div><div class="text-xs text-muted-foreground">{{ item.code }}</div></TableCell><TableCell><div>{{ item.convocation }}</div><div class="text-xs text-muted-foreground">{{ item.period }}</div></TableCell><TableCell>{{ item.teachers.join(', ') || 'Sin asignación' }}</TableCell><TableCell>{{ label(item.state) }}</TableCell><TableCell>{{ item.completion.toFixed(0) }} %</TableCell><TableCell>{{ item.unresolved_observations }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${item.subject}`"><DropdownMenuItem v-if="item.latest_revision_id" @select="router.push(`/coordinacion/revisiones/${item.latest_revision_id}`)"><Eye aria-hidden="true" />Abrir revisión</DropdownMenuItem><DropdownMenuItem v-else disabled>Sin revisión disponible</DropdownMenuItem></TableActionsMenu></TableCell></TableRow><TableEmpty v-if="data.syllabi.data.length === 0" :colspan="7">No hay expedientes para los filtros actuales.</TableEmpty></TableBody></Table><TablePagination :meta="data.syllabi" label="Paginación del detalle de expedientes" @update:page="load" /></CardContent></Card>
    </template>
  </PageFrame>
</template>
