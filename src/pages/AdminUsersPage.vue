<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getManagedUsers, type ManagedUser, type ManagedUsersResponse } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import { getSession } from '@/api/session';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import ManagedUserAccessAction from '@/components/domain/identity/ManagedUserAccessAction.vue';
import ManagedUserDetailSheet from '@/components/domain/identity/ManagedUserDetailSheet.vue';
import ManagedUserPendingActions from '@/components/domain/identity/ManagedUserPendingActions.vue';
import ManagedUserSheet from '@/components/domain/identity/ManagedUserSheet.vue';
import ImportSpreadsheetDialog from '@/components/domain/ImportSpreadsheetDialog.vue';
import { Badge } from '@/components/ui/badge';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
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
    if (user.pending_activation) return 'Pendiente';
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
const viewing = ref<ManagedUser | null>(null);
const viewOpen = ref(false);
const openUser = (user: ManagedUser): void => { viewing.value = user; viewOpen.value = true; };
const dialog = ref<'access' | 'resend' | 'delete' | null>(null);
const dialogOpen = (kind: 'access' | 'resend' | 'delete') => computed({ get: () => dialog.value === kind, set: (value: boolean) => { if (!value) dialog.value = null; } });
const accessOpen = dialogOpen('access');
const resendOpen = dialogOpen('resend');
const deleteOpen = dialogOpen('delete');
const changed = async (notice: string): Promise<void> => { toast.success(notice); await load(); };
const clearFilters = (): void => { q.value = ''; status.value = 'all'; role.value = 'all'; career.value = 'all'; void load(); };
onMounted(load);
</script>

<template>
    <PageFrame title="Usuarios y roles" description="Cuentas de coordinación, docencia y biblioteca." size="wide">
        <template #actions><div v-if="result" class="flex flex-wrap gap-2"><ImportSpreadsheetDialog title="Importar cuentas" description="Cree varias cuentas a la vez." endpoint="/admin/users/import" template-endpoint="/admin/users/import-template" template-name="plantilla-usuarios.xlsx" :columns="[{ key: 'nombre', label: 'Nombre' }, { key: 'correo', label: 'Correo' }, { key: 'rol', label: 'Rol' }, { key: 'carrera', label: 'Carrera' }]" @imported="changed" /><ManagedUserSheet :roles="result.roles" :careers="result.careers" @saved="changed" /></div></template>
        <LoadErrorState v-if="error" :message="error" @retry="load" />
        <LoadingSkeleton v-if="loading && !result" variant="table" :columns="5" :filters="3" :cell-lines="2" />

        <Card v-if="result"><CardContent class="flex flex-col gap-4">
            <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters">
                <template #search><Field><FieldLabel for="users-search" class="sr-only">Buscar por nombre o correo</FieldLabel><Input id="users-search" v-model="q" type="search" placeholder="Buscar por nombre o correo" /></Field></template>
                <template #filters>
                    <Field><FieldLabel for="users-role" class="sr-only">Rol</FieldLabel><Select v-model="role" name="role"><SelectTrigger id="users-role"><SelectValue placeholder="Todos los roles" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los roles</SelectItem><SelectItem v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-career" class="sr-only">Carrera</FieldLabel><Select v-model="career" name="career"><SelectTrigger id="users-career"><SelectValue placeholder="Todas las carreras" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las carreras</SelectItem><SelectItem v-for="item in result.careers" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field>
                    <Field><FieldLabel for="users-status" class="sr-only">Estado</FieldLabel><Select v-model="status" name="status"><SelectTrigger id="users-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="pending">Pendiente</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectGroup></SelectContent></Select></Field>
                </template>
            </FilterToolbar></form>

            <Table label="Usuarios y roles"><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol vigente</TableHead><TableHead>Carrera</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
                <TableEmpty v-if="result.users.data.length === 0" :colspan="4">No se encontraron cuentas con estos filtros.</TableEmpty>
                <TableRow v-for="user in result.users.data" v-else :key="user.id" class="cursor-pointer" tabindex="0" :aria-label="`Ver ${user.nombre}`" @click="activateRow($event, () => openUser(user))" @keydown.enter.self.prevent="openUser(user)" @keydown.space.self.prevent="openUser(user)">
                    <TableCell><div class="flex flex-col"><span>{{ user.nombre }}</span><span class="text-sm text-muted-foreground">{{ user.correo_electronico }}</span></div></TableCell>
                    <TableCell><div class="flex items-center gap-2"><span v-if="user.roles[0]">{{ user.roles[0].name }}</span><span v-else class="text-sm text-muted-foreground">Sin rol vigente</span><Badge v-if="user.roles.length > 1" variant="secondary">+{{ user.roles.length - 1 }}<span class="sr-only"> más</span></Badge></div></TableCell>
                    <TableCell><div class="flex items-center gap-2 text-sm"><span v-if="user.roles[0]" :class="user.roles[0].career_name ? '' : 'text-muted-foreground'">{{ careerOf(user.roles[0]) }}</span><span v-else class="text-muted-foreground">—</span><Badge v-if="user.roles.length > 1" variant="secondary">+{{ user.roles.length - 1 }}<span class="sr-only"> más</span></Badge></div></TableCell>
                    <TableCell>{{ statusOf(user) }}</TableCell>
                    
                </TableRow>
            </TableBody></Table>
            <ManagedUserDetailSheet v-if="viewing" :key="viewing.id" v-model:open="viewOpen" :user="viewing" :roles="result.roles" :careers="result.careers" :can-edit="viewing.id !== currentUserId" @saved="changed" @action="(key) => { dialog = key; }" />
            <ManagedUserAccessAction v-if="viewing" v-model:open="accessOpen" :user="viewing" @changed="changed" />
            <ManagedUserPendingActions v-if="viewing" v-model:resend-open="resendOpen" v-model:delete-open="deleteOpen" :user-id="viewing.id" :user-name="viewing.nombre" :user-email="viewing.correo_electronico" @changed="changed" />
            <TablePagination :meta="result.users" label="Paginación de usuarios" @update:page="load" />
        </CardContent></Card>
    </PageFrame>
</template>
