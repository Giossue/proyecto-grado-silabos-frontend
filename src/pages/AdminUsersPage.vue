<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { createManagedUser, deleteManagedUser, getManagedUsers, resendManagedUserAccess, setManagedUserStatus, type ManagedUsersResponse } from '@/api/admin-users';
import { getSession } from '@/api/session';
import FormSheet from '@/components/FormSheet.vue';
import PaginationControls from '@/components/PaginationControls.vue';

const router = useRouter();
const result = ref<ManagedUsersResponse | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const loading = ref(true);
const pendingUser = ref<string | null>(null);
const q = ref(''); const status = ref('all'); const role = ref('all');
const createOpen = ref(false);
const form = ref({ nombre: '', correo_electronico: '', password: '', role_code: 'docente', career_id: null as string | null });

const load = async (page = 1): Promise<void> => {
  loading.value = true; error.value = null;
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace('/panel'); return; }
    result.value = await getManagedUsers({ q: q.value, status: status.value, role: role.value, page });
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
const remove = async (id: string): Promise<void> => { if (!window.confirm('¿Eliminar esta cuenta pendiente?')) return; await actOnUser(id, () => deleteManagedUser(id), true); };
onMounted(load);
</script>

<template><main class="app-page"><header class="app-header"><div><p class="eyebrow">Administración</p><h1>Usuarios</h1></div><button class="primary-action" type="button" @click="createOpen = true">Crear cuenta</button></header>
  <form class="filter-form" @submit.prevent="load()"><label>Buscar<input v-model="q" type="search" /></label><label>Estado<select v-model="status"><option value="all">Todos</option><option value="active">Activos</option><option value="pending">Pendientes</option><option value="inactive">Inactivos</option></select></label><label>Rol<select v-model="role"><option value="all">Todos</option><option v-for="item in result?.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option></select></label><button>Filtrar</button></form>
  <p v-if="message" class="save-status" role="status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p><p v-if="loading && !result" role="status">Cargando usuarios…</p><template v-if="result"><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Roles</th><th>Estado</th><th>2FA</th><th>Acciones</th></tr></thead><tbody><tr v-for="user in result.users.data" :key="user.id"><td><RouterLink class="subject-link" :to="`/administracion/usuarios/${user.id}`">{{ user.nombre }}</RouterLink><small>{{ user.correo_electronico }}</small></td><td>{{ user.roles.map((item) => item.name + (item.career_name ? ` · ${item.career_name}` : '')).join(', ') }}</td><td>{{ user.active ? (user.pending_first_login ? 'Pendiente' : 'Activo') : 'Inactivo' }}</td><td>{{ user.two_factor_enabled ? 'Activo' : 'No' }}</td><td class="header-actions"><button :disabled="pendingUser === user.id" @click="setStatus(user.id, !user.active)">{{ user.active ? 'Desactivar' : 'Activar' }}</button><button v-if="user.pending_first_login" :disabled="pendingUser === user.id" @click="resend(user.id)">Reenviar</button><button v-if="user.pending_first_login" :disabled="pendingUser === user.id" @click="remove(user.id)">Eliminar</button></td></tr><tr v-if="!result.users.data.length"><td colspan="5" class="empty-state">No hay usuarios que coincidan con los filtros.</td></tr></tbody></table></div><PaginationControls :current-page="result.users.current_page" :last-page="result.users.last_page" :total="result.users.total" @change="load" /></template>
  <FormSheet :open="createOpen" title="Crear cuenta" description="La persona recibirá sus credenciales temporales por correo." @close="createOpen = false"><form class="editor-form" @submit.prevent="create"><label>Nombre <input v-model="form.nombre" placeholder="Ej. Ana Pérez" required /></label><label>Correo <input v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /></label><label>Contraseña temporal <input v-model="form.password" type="password" required /></label><label>Rol <select v-model="form.role_code"><option v-for="item in result?.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option></select></label><label v-if="form.role_code !== 'administrador'">Carrera <select v-model="form.career_id" required><option :value="null">Seleccione</option><option v-for="career in result?.careers" :key="career.id" :value="career.id">{{ career.nombre }}</option></select></label><div class="form-sheet-actions"><button type="button" @click="createOpen = false">Cancelar</button><button type="submit">Crear cuenta</button></div></form></FormSheet>
</main></template>
