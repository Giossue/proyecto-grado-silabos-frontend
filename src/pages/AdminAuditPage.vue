<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getAuditEvents, type AuditPayload } from '@/api/operations';
import { getSession } from '@/api/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paths } from '@/lib/routes';

const router = useRouter();
const data = ref<AuditPayload | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const load = async (page = 1): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') {
      await router.replace(paths.dashboard);
      return;
    }
    data.value = await getAuditEvents({ page: String(page) });
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la auditoría.';
  } finally {
    loading.value = false;
  }
};

const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value));

onMounted(() => { void load(); });
</script>

<template>
  <PageFrame title="Auditoría" description="Registro de las acciones realizadas en el sistema.">
    <LoadErrorState v-if="error" :message="error" @retry="load" />
    <LoadingSkeleton v-else-if="loading && !data" variant="table" :columns="4" />
    <Card v-else-if="data">
      <CardContent class="flex flex-col gap-4">
        <Table label="Registro de auditoría">
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Actividad</TableHead><TableHead>Responsable</TableHead><TableHead>Resultado</TableHead></TableRow></TableHeader>
          <TableBody>
            <TableRow v-for="event in data.events.data" :key="event.id">
              <TableCell class="text-xs whitespace-nowrap">{{ formatDate(event.occurred_at) }}</TableCell>
              <TableCell><div>{{ event.action }}</div><div class="text-xs text-muted-foreground">{{ event.resource }}</div></TableCell>
              <TableCell><div>{{ event.actor }}</div><div v-if="event.role || event.career" class="text-xs text-muted-foreground">{{ [event.role, event.career].filter(Boolean).join(' · ') }}</div></TableCell>
              <TableCell><Badge :variant="event.result === 'fallido' ? 'destructive' : 'secondary'">{{ event.result === 'fallido' ? 'Fallido' : 'Correcto' }}</Badge></TableCell>
            </TableRow>
            <TableEmpty v-if="data.events.data.length === 0" :colspan="4">Todavía no hay actividad registrada.</TableEmpty>
          </TableBody>
        </Table>
        <TablePagination :meta="data.events" label="Paginación del registro de auditoría" @update:page="load" />
      </CardContent>
    </Card>
  </PageFrame>
</template>
