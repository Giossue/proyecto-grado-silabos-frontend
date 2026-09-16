<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { createManagedUser, deleteManagedUser, getManagedUsers, resendManagedUserAccess, setManagedUserStatus, type ManagedUsersResponse } from '@/api/admin-users';
import { getSession } from '@/api/session';

const router = useRouter();
const result = ref<ManagedUsersResponse | null>(null);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const q = ref(''); const status = ref('all'); const role = ref('all');
const form = ref({ nombre: '', correo_electronico: '', password: '', role_code: 'docente', career_id: null as string | null });

const load = async (page = 1): Promise<void> => {
  try {
    const session = await getSession();
    if (session.active_role?.code !== 'administrador') { await router.replace('/panel'); return; }
    result.value = await getManagedUsers({ q: q.value, status: status.value, role: role.value, page });
  } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudieron cargar los usuarios.'; }
};
const create = async (): Promise<void> => {
  try { message.value = (await createManagedUser(form.value)).message; form.value = { nombre: '', correo_electronico: '', password: '', role_code: 'docente', career_id: null }; await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo crear la cuenta.'; }
};
const setStatus = async (id: string, active: boolean): Promise<void> => { message.value = (await setManagedUserStatus(id, active)).message; await load(); };
const resend = async (id: string): Promise<void> => { message.value = (await resendManagedUserAccess(id)).message; };
const remove = async (id: string): Promise<void> => { if (!window.confirm('¿Eliminar esta cuenta pendiente?')) return; message.value = (await deleteManagedUser(id)).message; await load(); };
onMounted(load);
</script>

<template><main class="app-page"><header class="app-header"><div><p class="eyebrow">Administración</p><h1>Usuarios</h1></div><RouterLink class="back-link" to="/panel">Volver al panel</RouterLink></header>
  <form class="filter-form" @submit.prevent="load()"><label>Buscar<input v-model="q" type="search" /></label><label>Estado<select v-model="status"><option value="all">Todos</option><option value="active">Activos</option><option value="pending">Pendientes</option><option value="inactive">Inactivos</option></select></label><label>Rol<select v-model="role"><option value="all">Todos</option><option v-for="item in result?.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option></select></label><button>Filtrar</button></form>
  <form class="detail-card" @submit.prevent="create"><h2>Crear cuenta</h2><label>Nombre<input v-model="form.nombre" required /></label><label>Correo<input v-model="form.correo_electronico" type="email" required /></label><label>Contraseña temporal<input v-model="form.password" type="password" required /></label><label>Rol<select v-model="form.role_code"><option v-for="item in result?.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option></select></label><label v-if="form.role_code !== 'administrador'">Carrera<select v-model="form.career_id" required><option :value="null">Seleccione</option><option v-for="career in result?.careers" :key="career.id" :value="career.id">{{ career.nombre }}</option></select></label><button>Crear cuenta</button></form>
  <p v-if="message" class="save-status">{{ message }}</p><p v-if="error" role="alert">{{ error }}</p><div v-if="result" class="table-wrap"><table><thead><tr><th>Usuario</th><th>Roles</th><th>Estado</th><th>2FA</th><th>Acciones</th></tr></thead><tbody><tr v-for="user in result.users.data" :key="user.id"><td>{{ user.nombre }}<small>{{ user.correo_electronico }}</small></td><td>{{ user.roles.map((item) => item.name + (item.career_name ? ` · ${item.career_name}` : '')).join(', ') }}</td><td>{{ user.active ? (user.pending_first_login ? 'Pendiente' : 'Activo') : 'Inactivo' }}</td><td>{{ user.two_factor_enabled ? 'Activo' : 'No' }}</td><td class="header-actions"><button @click="setStatus(user.id, !user.active)">{{ user.active ? 'Desactivar' : 'Activar' }}</button><button v-if="user.pending_first_login" @click="resend(user.id)">Reenviar</button><button v-if="user.pending_first_login" @click="remove(user.id)">Eliminar</button></td></tr></tbody></table></div>
</main></template>
