<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { getManagedUsers, type ManagedUser, type ManagedUsersResponse } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import ManagedUserDetailSheet from '@/components/domain/identity/ManagedUserDetailSheet.vue';
import ManagedUserEditSheet from '@/components/domain/identity/ManagedUserEditSheet.vue';
import ManagedUserPendingActions from '@/components/domain/identity/ManagedUserPendingActions.vue';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const router = useRouter();
const result = ref<ManagedUsersResponse | null>(null);
const error = ref<string | null>(null); const message = ref<string | null>(null); const loading = ref(true);
const q = ref(''); const status = ref('all'); const role = ref('all'); const career = ref('all');
const statusOf = (user: ManagedUser): { label: string; hint: string } => {
    if (!user.active) return { label: 'Inactivo', hint: 'La cuenta está desactivada y no puede iniciar sesión.' };
    if (user.pending_first_login) return { label: 'Pendiente de activación', hint: 'La cuenta se creó y todavía nadie ha iniciado sesión con ella. Conserva su contraseña temporal.' };
    return { label: 'Activo', hint: 'La cuenta está en uso y su titular ya definió su contraseña.' };
};
const load = async (page = 1): Promise<void> => {
    loading.value = true; error.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') { await router.replace('/dashboard'); return; }
        result.value = await getManagedUsers({ q: q.value, status: status.value, role: role.value, career: career.value, page });
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los usuarios.'; }
    finally { loading.value = false; }
};
const changed = async (notice: string): Promise<void> => { message.value = notice; await load(); };
const clearFilters = (): void => { q.value = ''; status.value = 'all'; role.value = 'all'; career.value = 'all'; void load(); };
onMounted(load);
</script>

<template>
    <PageFrame title="Usuarios y roles" description="Cuentas de coordinación y docencia: crearlas y decir de qué carrera son. Al desactivar una, su sesión se cierra.">
        <template #actions><ManagedUserSheet v-if="result" :roles="result.roles" :careers="result.careers" @saved="changed" /></template>
        <Alert v-if="message"><AlertDescription>{{ message }}</AlertDescription></Alert>
        <Alert v-if="error" variant="destructive"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <LoadingSkeleton v-if="loading && !result" />

        <Card v-if="result"><CardContent class="flex flex-col gap-4">
            <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters">
                <template #search><Field><FieldLabel for="users-search" class="sr-only">Buscar por nombre o correo</FieldLabel><Input id="users-search" v-model="q" type="search" placeholder="Buscar por nombre o correo" /></Field></template>
                <template #filters>
                    <Field><FieldLabel for="users-role" class="sr-only">Rol</FieldLabel><Select v-model="role"><SelectTrigger id="users-role"><SelectValue placeholder="Todos los roles" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los roles</SelectItem><SelectItem v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-career" class="sr-only">Carrera</FieldLabel><Select v-model="career"><SelectTrigger id="users-career"><SelectValue placeholder="Todas las carreras" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las carreras</SelectItem><SelectItem v-for="item in result.careers" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-status" class="sr-only">Estado</FieldLabel><Select v-model="status"><SelectTrigger id="users-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="pending">Pendiente de activación</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectGroup></SelectContent></Select></Field>
                </template>
            </FilterToolbar></form>

            <Table><TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Rol vigente</TableHead><TableHead>Carrera</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                <TableEmpty v-if="result.users.data.length === 0" :colspan="5">No se encontraron cuentas con estos filtros.</TableEmpty>
                <TableRow v-for="user in result.users.data" v-else :key="user.id">
                    <TableCell><div class="flex flex-col"><span>{{ user.nombre }}</span><span class="text-sm text-muted-foreground">{{ user.correo_electronico }}</span></div></TableCell>
                    <TableCell><div class="flex flex-col items-start gap-1"><span v-for="(item, index) in user.roles" :key="`rol-${index}`">{{ item.name }}</span><span v-if="user.roles.length === 0" class="text-sm text-muted-foreground">Sin rol vigente</span></div></TableCell>
                    <TableCell><div class="flex flex-col items-start gap-1 text-sm"><span v-for="(scope, index) in user.careers" :key="`carrera-${index}`" :class="scope ? '' : 'text-muted-foreground'">{{ scope ?? 'Todas las carreras' }}</span><span v-if="user.careers.length === 0" class="text-muted-foreground">—</span></div></TableCell>
                    <TableCell><Tooltip><TooltipTrigger as-child><span>{{ statusOf(user).label }}</span></TooltipTrigger><TooltipContent class="max-w-xs">{{ statusOf(user).hint }}</TooltipContent></Tooltip></TableCell>
                    <TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${user.nombre}`"><ManagedUserDetailSheet :user="user" /><ManagedUserEditSheet display="menu" :user="user" :roles="result.roles" :careers="result.careers" @saved="changed" /><ManagedUserPendingActions v-if="user.pending_first_login" :user-id="user.id" :user-name="user.nombre" :user-email="user.correo_electronico" @changed="changed" /></TableActionsMenu></TableCell>
                </TableRow>
            </TableBody></Table>
            <TablePagination :meta="result.users" label="Paginación de usuarios" @update:page="load" />
        </CardContent></Card>
    </PageFrame>
</template>
