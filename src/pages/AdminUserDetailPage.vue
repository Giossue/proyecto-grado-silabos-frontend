<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { getManagedUser, setManagedUserStatus, type ManagedUserDetailResponse } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import ClientFilterBar from '@/components/domain/ClientFilterBar.vue';
import RoleAssignmentSheet from '@/components/domain/identity/RoleAssignmentSheet.vue';
import UserProfileSheet from '@/components/domain/identity/UserProfileSheet.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClientFilter } from '@/composables/useClientFilter';
import { useClientPagination } from '@/composables/useClientPagination';
import { sessionState } from '@/state/session';
import { paths } from '@/lib/routes';

const route = useRoute(); const userId = String(route.params.user);
const result = ref<ManagedUserDetailResponse | null>(null); const loading = ref(true); const pending = ref(false);
const message = ref<string | null>(null); const loadError = ref<string | null>(null); const actionError = ref<string | null>(null);
const assignments = computed(() => result.value?.managedUser.assignments ?? []);
const assignmentFilter = useClientFilter(() => assignments.value, (item) => [item.role_name, item.career_name], { estado: { matches: (item, value) => item.effective === (value === 'active') } });
const { items: assignmentPage, meta: assignmentMeta, setPage: setAssignmentPage } = useClientPagination(() => assignmentFilter.items.value);
const load = async (): Promise<void> => { loading.value = true; loadError.value = null; try { result.value = await getManagedUser(userId); } catch (reason) { loadError.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la cuenta.'; } finally { loading.value = false; } };
const changed = async (notice: string): Promise<void> => { message.value = notice; await load(); };
const toggleStatus = async (): Promise<void> => { if (!result.value) return; pending.value = true; actionError.value = null; try { await changed((await setManagedUserStatus(userId, !result.value.managedUser.active)).message); } catch (reason) { actionError.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado.'; } finally { pending.value = false; } };
onMounted(load);
</script>

<template><PageFrame :title="result?.managedUser.nombre ?? 'Detalle de cuenta'" :description="result?.managedUser.correo_electronico ?? 'Información de la cuenta y sus asignaciones.'">
    <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink :to="paths.admin.users">← Volver a usuarios</RouterLink></Button></template>
    <template v-if="result" #meta><Badge :variant="result.managedUser.active ? 'secondary' : 'outline'">{{ result.managedUser.active ? 'Cuenta activa' : 'Cuenta inactiva' }}</Badge></template>
    <template v-if="result" #actions>
        <UserProfileSheet :user-id="result.managedUser.id" :nombre="result.managedUser.nombre" :correo_electronico="result.managedUser.correo_electronico" @saved="changed" />
        <RoleAssignmentSheet :managed-user-id="result.managedUser.id" :roles="result.roles" :careers="result.careers" @saved="changed" />
        <Button v-if="sessionState.current.value?.user.id !== result.managedUser.id" type="button" variant="outline" :disabled="pending" @click="toggleStatus"><Spinner v-if="pending" />{{ result.managedUser.active ? 'Desactivar y revocar sesiones' : 'Activar cuenta' }}</Button>
    </template>
    <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert><Alert v-if="actionError" variant="destructive"><AlertDescription>{{ actionError }}</AlertDescription></Alert><LoadErrorState v-if="loadError" :message="loadError" @retry="load" /><LoadingSkeleton v-else-if="loading && !result" variant="table-detail" :columns="3" />
    <Card v-else-if="result"><CardHeader><CardTitle>Historial de roles</CardTitle><CardDescription>Las asignaciones anteriores se conservan para trazabilidad.</CardDescription></CardHeader><CardContent class="flex flex-col gap-4">
        <ClientFilterBar :filter="assignmentFilter" input-id="assignments-search" label="Buscar rol o carrera" placeholder="Buscar por rol o carrera"><template #filters><Field><FieldLabel for="assignments-state" class="sr-only">Estado</FieldLabel><Select v-model="assignmentFilter.values.estado.value"><SelectTrigger id="assignments-state"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Vigentes</SelectItem><SelectItem value="inactive">Finalizadas</SelectItem></SelectGroup></SelectContent></Select></Field></template></ClientFilterBar>
        <Table><TableHeader><TableRow><TableHead>Rol</TableHead><TableHead>Alcance</TableHead><TableHead>Estado efectivo</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="assignmentPage.length === 0" :colspan="3">No existen asignaciones con este filtro.</TableEmpty><TableRow v-for="assignment in assignmentPage" v-else :key="assignment.id"><TableCell>{{ assignment.role_name }}</TableCell><TableCell>{{ assignment.career_name ?? 'Institucional' }}</TableCell><TableCell>{{ assignment.active ? 'Activo' : 'Finalizada' }}</TableCell></TableRow></TableBody></Table>
        <TablePagination :meta="assignmentMeta" mode="client" label="Paginación del historial de roles" @update:page="setAssignmentPage" />
    </CardContent></Card>
</PageFrame></template>
