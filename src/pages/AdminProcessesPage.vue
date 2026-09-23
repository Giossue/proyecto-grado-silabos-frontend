<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getProcesses, type Processes, type SyllabusProcess } from '@/api/processes';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import SyllabusProcessActions from '@/components/domain/syllabus/SyllabusProcessActions.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter(); const data = ref<Processes | null>(null); const loading = ref(true);
const error = ref<string | null>(null);
const processes = computed(() => data.value?.processes ?? []);
const filter = useClientFilter(processes, (item) => [item.period_name], { estado: { matches: (item, value) => item.state === value } });
const { items: processPage, meta: processMeta, setPage: setProcessPage } = useClientPagination(() => filter.items.value);
const stateLabel = (state: SyllabusProcess['state']): string => ({ abierto: 'Abierto', pausado: 'En pausa', cerrado: 'Cerrado' })[state];
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value));
const load = async (): Promise<void> => { loading.value = true; error.value = null; try { const session = await getSession(); if (session.active_role?.code !== 'administrador') { await router.replace(paths.dashboard); return; } data.value = await getProcesses(); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los procesos institucionales.'; } finally { loading.value = false; } };
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
onMounted(load);
</script>

<template><PageFrame title="Convocatorias de sílabos" description="Aquí se supervisa la convocatoria institucional y sus alcances. Se abre desde el período académico; cada coordinación inicia después su convocatoria heredada.">
    <LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="5" />
    <Card v-if="data"><CardContent class="flex flex-col gap-4"><ClientFilterBar :filter="filter" input-id="processes-search" label="Buscar período" placeholder="Buscar por período"><template #filters><Field><FieldLabel for="processes-search-state" class="sr-only">Estado</FieldLabel><Select v-model="filter.values.estado.value"><SelectTrigger id="processes-search-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="abierto">Abiertos</SelectItem><SelectItem value="pausado">En pausa</SelectItem><SelectItem value="cerrado">Cerrados</SelectItem></SelectGroup></SelectContent></Select></Field></template></ClientFilterBar>
        <Table data-cards="true"><TableHeader><TableRow><TableHead>Período</TableHead><TableHead>Inicio</TableHead><TableHead>Entrega</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="processPage.length === 0" :colspan="5">{{ filter.active.value ? 'Ningún período coincide con los filtros.' : 'No hay convocatorias institucionales. Ve a Períodos académicos para preparar una.' }}</TableEmpty><TableRow v-for="process in processPage" v-else :key="process.id"><TableCell>{{ process.period_name }}</TableCell><TableCell>{{ formatDate(process.starts_at) }}</TableCell><TableCell>{{ formatDate(process.due_at) }}</TableCell><TableCell>{{ stateLabel(process.state) }}</TableCell><TableCell class="text-right"><SyllabusProcessActions :process="process" :template="data.template" :periods="data.periods" @completed="changed" /></TableCell></TableRow></TableBody></Table>
        <TablePagination :meta="processMeta" label="Paginación de procesos de sílabos" @update:page="setProcessPage" />
    </CardContent></Card>
</PageFrame></template>
