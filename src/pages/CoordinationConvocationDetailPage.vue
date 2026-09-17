<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getConvocation, type ConvocationDetail } from '@/api/convocations';
import { getSession } from '@/api/session';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const data = ref<ConvocationDetail | null>(null);
const error = ref<string | null>(null);
const convocationId = (): string => String(route.params.convocation);
const stateLabel = (value: string): string => ({ sin_iniciar: 'Sin iniciar', borrador: 'Borrador', en_revision: 'En revisión', correccion_solicitada: 'Corrección solicitada', aprobado: 'Aprobado' })[value] ?? 'Estado no disponible';
const convocationStateLabel = (value: string): string => ({ preparacion: 'En preparación', abierta: 'Abierta', pausada: 'En pausa', cerrada: 'Cerrada' })[value] ?? 'Estado no disponible';
const formatDate = (value: string | null): string => value ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(new Date(value)) : 'Sin fecha';
const syllabusFilter = useClientFilter(
  () => data.value?.convocation.syllabi ?? [],
  (item) => [item.subject, item.code, item.state],
  { estado: { matches: (item, value) => item.state === value } },
);
const { items: syllabusPage, meta: syllabusMeta, setPage: setSyllabusPage } = useClientPagination(() => syllabusFilter.items.value);
const load = async (): Promise<void> => {
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'coordinador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = await getConvocation(convocationId());
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la convocatoria.';
  }
};

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame :title="data?.convocation.name ?? 'Convocatoria'" :description="data ? `${data.convocation.period} · ${data.convocation.template}` : 'Detalle de la convocatoria.'">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.coordination.convocations">← Volver a convocatorias</RouterLink></Button></template>
    <template v-if="data" #meta><Badge :variant="data.convocation.state === 'abierta' ? 'secondary' : 'outline'">{{ convocationStateLabel(data.convocation.state) }}</Badge><Badge variant="outline">{{ data.convocation.process.name }}</Badge></template>
    <LoadErrorState v-if="error" :message="error" @retry="load" /><LoadingSkeleton v-else-if="!data" variant="detail" />
    <template v-if="data">
      <Alert v-if="data.convocation.state === 'preparacion'"><AlertTitle>Revise antes de abrir</AlertTitle><AlertDescription>La apertura fija la plantilla del proceso y estas fuentes, valida que cada paralelo tenga docente vigente y genera todos los expedientes en una sola transacción. Si algo falta, no se crea ninguno.{{ data.convocation.process.state !== 'abierto' ? ' Solo podrá abrir cuando Administración abra el proceso institucional.' : '' }}</AlertDescription></Alert>
      <Alert v-else-if="data.convocation.state === 'pausada'"><AlertTitle>Convocatoria en pausa</AlertTitle><AlertDescription>Los docentes de su carrera no editan ni envían hasta que la reanude. Mientras tanto puede corregir la malla y las fuentes.</AlertDescription></Alert>
      <Alert v-else-if="data.convocation.process.state === 'pausado'"><AlertTitle>Proceso institucional en pausa</AlertTitle><AlertDescription>Administración pausó «{{ data.convocation.process.name }}». Nadie envía hasta que lo reanude; su convocatoria seguirá abierta cuando eso ocurra.</AlertDescription></Alert>
      <Alert v-else-if="data.convocation.process.state === 'cerrado'"><AlertTitle>Proceso institucional cerrado</AlertTitle><AlertDescription>Administración cerró «{{ data.convocation.process.name }}». Los expedientes se conservan, pero ya no admiten envíos.</AlertDescription></Alert>
      <div class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <Card><CardHeader><CardTitle>Seguimiento por expediente</CardTitle><CardDescription>Elaboración desde {{ formatDate(data.convocation.start_date) }} hasta {{ formatDate(data.convocation.draft_deadline) }}. Vencido el plazo, el envío se bloquea hasta que conceda una prórroga.</CardDescription></CardHeader><CardContent class="flex flex-col gap-4">
          <ClientFilterBar :filter="syllabusFilter" input-id="convocation-syllabi-search" label="Buscar expediente" placeholder="Buscar por asignatura o código"><template #filters><Field><FieldLabel for="convocation-syllabi-search-state" class="sr-only">Estado</FieldLabel><Select v-model="syllabusFilter.values.estado.value"><SelectTrigger id="convocation-syllabi-search-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="sin_iniciar">Sin iniciar</SelectItem><SelectItem value="borrador">Borrador</SelectItem><SelectItem value="en_revision">En revisión</SelectItem><SelectItem value="aprobado">Aprobado</SelectItem></SelectGroup></SelectContent></Select></Field></template></ClientFilterBar>
          <Table><TableHeader><TableRow><TableHead>Asignatura</TableHead><TableHead>Paralelos y docentes</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Completitud</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="data.convocation.syllabi.length === 0" :colspan="4">Los expedientes aparecerán después de abrir la convocatoria.</TableEmpty><TableRow v-for="syllabus in syllabusPage" v-else :key="syllabus.id"><TableCell><div>{{ syllabus.subject }}</div><div class="text-sm text-muted-foreground">{{ syllabus.code }}</div></TableCell><TableCell><div>Paralelos {{ syllabus.parallels.join(', ') }}</div><div class="text-sm text-muted-foreground">{{ syllabus.teachers.join(', ') }}</div></TableCell><TableCell>{{ stateLabel(syllabus.state) }}</TableCell><TableCell class="text-right">{{ syllabus.completion.toFixed(0) }} %</TableCell></TableRow></TableBody></Table>
          <TablePagination :meta="syllabusMeta" label="Paginación del seguimiento de convocatoria" @update:page="setSyllabusPage" />
        </CardContent></Card>
        <Card class="h-fit"><CardHeader><CardTitle>Configuración fijada</CardTitle><CardDescription>No cambia los expedientes después de abrir.</CardDescription></CardHeader><CardContent class="flex flex-col gap-4 text-sm"><div><div class="font-medium">Proceso institucional</div><div class="text-muted-foreground">{{ data.convocation.process.name }}</div></div><div><div class="font-medium">Plantilla</div><div class="text-muted-foreground">{{ data.convocation.template }}</div></div><div><div class="font-medium">Fuentes</div><ul class="mt-1 flex list-disc flex-col gap-1 pl-5 text-muted-foreground"><li v-for="source in data.convocation.sources" :key="source">{{ source }}</li></ul></div></CardContent></Card>
      </div>
    </template>
  </PageFrame>
</template>
