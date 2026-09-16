<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { createManagedUser, deleteManagedUser, getManagedUsers, resendManagedUserAccess, setManagedUserStatus, type ManagedUsersResponse } from '@/api/admin-users';
import { getSession } from '@/api/session';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import FilterToolbar from '@/components/domain/FilterToolbar.vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import TablePagination from '@/components/domain/TablePagination.vue';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const router = useRouter();
const result = ref<ManagedUsersResponse | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const loading = ref(true);
const pendingUser = ref<string | null>(null);
const q = ref(''); const status = ref('all'); const role = ref('all'); const career = ref('all');
const createOpen = ref(false);
const deleteOpen = ref(false);
const deleteTarget = ref<{ id: string; nombre: string } | null>(null);
const form = ref({ nombre: '', correo_electronico: '', password: '', role_code: 'docente', career_id: null as string | null });

const load = async (page = 1): Promise<void> => {
  loading.value = true; error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace('/panel'); return; }
    result.value = await getManagedUsers({ q: q.value, status: status.value, role: role.value, career: career.value, page });
  } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los usuarios.'; }
  finally { loading.value = false; }
};
const create = async (): Promise<void> => {
  try { message.value = (await createManagedUser(form.value)).message; form.value = { nombre: '', correo_electronico: '', password: '', role_code: 'docente', career_id: null }; createOpen.value = false; await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo crear la cuenta.'; }
};
const actOnUser = async (id: string, operation: () => Promise<{ message: string }>, reload = false): Promise<void> => {
  pendingUser.value = id; error.value = null; message.value = null;
  try { message.value = (await operation()).message; if (reload) await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo completar la acción sobre la cuenta.'; }
  finally { pendingUser.value = null; }
};
const setStatus = (id: string, active: boolean): Promise<void> => actOnUser(id, () => setManagedUserStatus(id, active), true);
const resend = (id: string): Promise<void> => actOnUser(id, () => resendManagedUserAccess(id));
const openDelete = (id: string, nombre: string): void => {
  deleteTarget.value = { id, nombre };
  deleteOpen.value = true;
};
const remove = async (): Promise<void> => {
  if (!deleteTarget.value) return;
  const { id } = deleteTarget.value;
  await actOnUser(id, () => deleteManagedUser(id), true);
  if (!error.value) {
    deleteOpen.value = false;
    deleteTarget.value = null;
  }
};
const clearFilters = (): void => { q.value = ''; status.value = 'all'; role.value = 'all'; career.value = 'all'; void load(); };
onMounted(load);
</script>

<template><PageFrame title="Usuarios y roles" description="Cuentas de coordinación y docencia: crearlas y decir de qué carrera son. Al desactivar una, su sesión se cierra.">
  <template #actions><FormSheet v-model:open="createOpen" trigger-label="Crear cuenta" title="Crear cuenta" description="La persona recibirá sus credenciales temporales por correo."><template #default="{ close }"><form class="space-y-5" @submit.prevent="create"><Field><FieldLabel for="managed-name" required>Nombre completo</FieldLabel><Input id="managed-name" v-model="form.nombre" placeholder="Ej. ANA PÉREZ" required /></Field><Field><FieldLabel for="managed-email" required>Correo institucional</FieldLabel><Input id="managed-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /></Field><Field><FieldLabel for="managed-password" required>Contraseña temporal</FieldLabel><Input id="managed-password" v-model="form.password" type="password" required /></Field><Field><FieldLabel for="managed-role" required>Rol</FieldLabel><Select v-model="form.role_code"><SelectTrigger id="managed-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem v-for="item in result?.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectContent></Select></Field><Field v-if="form.role_code !== 'administrador'"><FieldLabel for="managed-career" required>Carrera</FieldLabel><Select v-model="form.career_id"><SelectTrigger id="managed-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectItem v-for="career in result?.careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectContent></Select></Field><FormSheetActions label="Crear cuenta" :close="close" /></form></template></FormSheet></template>
  <p v-if="message" class="text-sm" role="status">{{ message }}</p><p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p><p v-if="loading && !result" class="text-sm text-muted-foreground" role="status">Cargando usuarios…</p>
  <Card v-if="result"><CardContent class="flex flex-col gap-4">
    <form @submit.prevent="load()"><FilterToolbar @clear="clearFilters"><template #search><Field><FieldLabel for="users-search" class="sr-only">Buscar por nombre o correo</FieldLabel><Input id="users-search" v-model="q" type="search" placeholder="Buscar por nombre o correo" /></Field></template><template #filters><Field><FieldLabel for="users-role" class="sr-only">Rol</FieldLabel><Select v-model="role"><SelectTrigger id="users-role"><SelectValue placeholder="Todos los roles" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los roles</SelectItem><SelectItem v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel for="users-career" class="sr-only">Carrera</FieldLabel><Select v-model="career"><SelectTrigger id="users-career"><SelectValue placeholder="Todas las carreras" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todas las carreras</SelectItem><SelectItem v-for="item in result.careers" :key="item.id" :value="item.id">{{ item.nombre }}</SelectItem></SelectGroup></SelectContent></Select></Field><Field><FieldLabel for="users-status" class="sr-only">Estado</FieldLabel><Select v-model="status"><SelectTrigger id="users-status"><SelectValue placeholder="Todos los estados" /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="all">Todos los estados</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="pending">Pendiente de activación</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectGroup></SelectContent></Select></Field></template></FilterToolbar></form>
    <Table><TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Rol vigente</TableHead><TableHead>Carrera</TableHead><TableHead>Estado</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="result.users.data.length === 0" :colspan="5">No se encontraron cuentas con estos filtros.</TableEmpty><TableRow v-for="user in result.users.data" v-else :key="user.id"><TableCell><RouterLink class="font-medium hover:underline" :to="`/administracion/usuarios/${user.id}`">{{ user.nombre }}</RouterLink><span class="block text-sm text-muted-foreground">{{ user.correo_electronico }}</span></TableCell><TableCell><span v-for="item in user.roles" :key="item.name" class="block">{{ item.name }}</span></TableCell><TableCell><span v-for="item in user.roles" :key="`${item.name}-career`" class="block text-sm">{{ item.career_name ?? 'Todas las carreras' }}</span></TableCell><TableCell>{{ user.active ? (user.pending_first_login ? 'Pendiente de activación' : 'Activo') : 'Inactivo' }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${user.nombre}`" :disabled="pendingUser === user.id"><DropdownMenuItem @select="setStatus(user.id, !user.active)">{{ user.active ? 'Desactivar' : 'Activar' }}</DropdownMenuItem><DropdownMenuItem v-if="user.pending_first_login" @select="resend(user.id)">Reenviar acceso</DropdownMenuItem><DropdownMenuItem v-if="user.pending_first_login" class="text-destructive" @select="openDelete(user.id, user.nombre)">Eliminar cuenta</DropdownMenuItem></TableActionsMenu></TableCell></TableRow></TableBody></Table>
    <TablePagination :meta="result.users" label="Paginación de usuarios" @update:page="load" />
  </CardContent></Card>
  <Dialog v-model:open="deleteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Eliminar cuenta pendiente</DialogTitle>
        <DialogDescription>Se eliminará la cuenta de {{ deleteTarget?.nombre }}. Esta acción no se puede deshacer.</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
        <Button type="button" variant="destructive" :disabled="pendingUser === deleteTarget?.id" @click="remove">Eliminar cuenta</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</PageFrame></template>
