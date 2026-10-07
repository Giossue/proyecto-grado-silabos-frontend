<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getManagedUsers, type ManagedUser, type ManagedUsersResponse } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import ManagedUserAccessAction from '@/components/domain/identity/ManagedUserAccessAction.vue';
import ManagedUserDetailSheet from '@/components/domain/identity/ManagedUserDetailSheet.vue';
import ManagedUserEditSheet from '@/components/domain/identity/ManagedUserEditSheet.vue';
import ManagedUserPendingActions from '@/components/domain/identity/ManagedUserPendingActions.vue';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';
import ImportSpreadsheetDialog from '@/components/domain/ImportSpreadsheetDialog.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { activateRow } from '@/lib/rowActivation';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const route = useRoute();
const currentUserId = ref<string | null>(null);
const result = ref<ManagedUsersResponse | null>(null);
const error = ref<string | null>(null); const loading = ref(true);
const q = ref(typeof route.query.q === 'string' ? route.query.q : ''); const status = ref('all'); const role = ref('all'); const career = ref('all');
const statusOf = (user: ManagedUser): string => {
    if (!user.active) return 'Inactivo';
    if (user.pending_activation) return 'Pendiente de activación';
    return 'Activo';
};
const careerOf = (role: ManagedUser['roles'][number]): string =>
    role.code === 'administrador' ? '-' : (role.career_name ?? 'Todas las carreras');
const load = async (page = 1): Promise<void> => {
    loading.value = true; error.value = null;
    try {
        const session = await getSession();
        if (session.active_role?.code !== 'administrador') { await router.replace(paths.dashboard); return; }
        currentUserId.value = session.user.id;
        result.value = await getManagedUsers({ q: q.value, status: status.value, role: role.value, career: career.value, page });
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los usuarios.'; }
    finally { loading.value = false; }
};
const editing = ref<ManagedUser | null>(null);
const openUser = (user: ManagedUser): void => { if (user.id !== currentUserId.value) editing.value = user; };
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
const clearFilters = (): void => { q.value = ''; status.value = 'all'; role.value = 'all'; career.value = 'all'; void load(); };
onMounted(load);
</script>

<template>
    <PageFrame title="Usuarios y roles" description="Cuentas de coordinación, docencia y biblioteca. Coordinación y docencia van con su carrera; biblioteca trabaja con toda la universidad. Al desactivar una, su sesión se cierra.">
        <template #actions><div v-if="result" class="flex flex-wrap gap-2"><ImportSpreadsheetDialog title="Importar cuentas" description="Cree varias cuentas a la vez. Cada una recibe su invitación de activación." endpoint="/admin/users/import" template-endpoint="/admin/users/import-template" template-name="plantilla-usuarios.xlsx" :columns="[{ key: 'nombre', label: 'Nombre' }, { key: 'correo', label: 'Correo' }, { key: 'rol', label: 'Rol' }, { key: 'carrera', label: 'Carrera' }]" @imported="changed" /><ManagedUserSheet :roles="result.roles" :careers="result.careers" @saved="changed" /></div></template>
        <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-if="loading && !result" variant="table" :columns="5" :filters="3" :cell-lines="2" />

        <Card v-if="result"><CardContent class="flex flex-col gap-4">
            <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters">
                <template #search><Field><FieldLabel for="users-search" class="sr-only">Buscar por nombre o correo</FieldLabel><Input id="users-search" v-model="q" type="search" placeholder="Buscar por nombre o correo" /></Field></template>
                <template #filters>
                    <Field><FieldLabel for="users-role" class="sr-only">Rol</FieldLabel><Select v-model="role" name="role"><SelectTrigger id="users-role"><SelectValue placeholder="Todos los roles" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los roles</SelectItem><SelectItem v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-career" class="sr-only">Carrera</FieldLabel><Select v-model="career" name="career"><SelectTrigger id="users-career"><SelectValue placeholder="Todas las carreras" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las carreras</SelectItem><SelectItem v-for="item in result.careers" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-status" class="sr-only">Estado</FieldLabel><Select v-model="status" name="status"><SelectTrigger id="users-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="pending">Pendiente de activación</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectGroup></SelectContent></Select></Field>
                </template>
            </FilterToolbar></form>

            <Table><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol vigente</TableHead><TableHead>Carrera</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
                <TableEmpty v-if="result.users.data.length === 0" :colspan="5">No se encontraron cuentas con estos filtros.</TableEmpty>
                <TableRow v-for="user in result.users.data" v-else :key="user.id" :class="user.id !== currentUserId ? 'cursor-pointer' : ''" :tabindex="user.id !== currentUserId ? 0 : undefined" :aria-label="user.id !== currentUserId ? `Editar ${user.nombre}` : undefined" @click="activateRow($event, () => openUser(user))" @keydown.enter.self.prevent="openUser(user)">
                    <TableCell><div class="flex flex-col"><span>{{ user.nombre }}</span><span class="text-sm text-muted-foreground">{{ user.correo_electronico }}</span></div></TableCell>
                    <TableCell><div class="flex flex-col items-start gap-1"><span v-for="(item, index) in user.roles" :key="`rol-${index}`">{{ item.name }}</span><span v-if="user.roles.length === 0" class="text-sm text-muted-foreground">Sin rol vigente</span></div></TableCell>
                    <TableCell><div class="flex flex-col items-start gap-1 text-sm"><span v-for="(item, index) in user.roles" :key="`ambito-${index}`" :class="item.career_name ? '' : 'text-muted-foreground'">{{ careerOf(item) }}</span><span v-if="user.roles.length === 0" class="text-muted-foreground">—</span></div></TableCell>
                    <TableCell>{{ statusOf(user) }}</TableCell>
                    <TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${user.nombre}`"><ManagedUserDetailSheet :user="user" /><ManagedUserAccessAction v-if="user.id !== currentUserId && !user.pending_activation" :user="user" @changed="changed" /><ManagedUserPendingActions v-if="user.pending_activation && user.active" :user-id="user.id" :user-name="user.nombre" :user-email="user.correo_electronico" @changed="changed" /></TableActionsMenu></TableCell>
                </TableRow>
            </TableBody></Table>
            <ManagedUserEditSheet v-if="editing" :key="editing.id" display="none" :open="true" :user="editing" :roles="result.roles" :careers="result.careers" @update:open="(value: boolean) => { if (!value) editing = null; }" @saved="changed" />
            <TablePagination :meta="result.users" label="Paginación de usuarios" @update:page="load" />
        </CardContent></Card>
    </PageFrame>
</template>
