<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { assignManagedUserRole, getManagedUser, updateManagedUser, type ManagedUserDetailResponse } from '@/api/admin-users';

const route = useRoute();
const result = ref<ManagedUserDetailResponse | null>(null);
const profile = ref({ nombre: '', correo_electronico: '', active: true });
const role = ref({ role_code: 'docente', career_id: null as string | null });
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);
const userId = String(route.params.user);

const load = async (): Promise<void> => {
  try { result.value = await getManagedUser(userId); profile.value = { nombre: result.value.managedUser.nombre, correo_electronico: result.value.managedUser.correo_electronico, active: result.value.managedUser.active }; }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la cuenta.'; }
};
const save = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { message.value = (await updateManagedUser(userId, profile.value)).message; await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo actualizar la cuenta.'; } finally { pending.value = false; }
};
const addRole = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { message.value = (await assignManagedUserRole(userId, role.value)).message; role.value = { role_code: 'docente', career_id: null }; await load(); }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo asignar el rol.'; } finally { pending.value = false; }
};
onMounted(load);
</script>

<template><main class="app-page"><header class="app-header"><div><p class="eyebrow">Administración · Usuarios</p><h1>{{ result?.managedUser.nombre ?? 'Detalle de cuenta' }}</h1></div><RouterLink class="back-link" to="/administracion/usuarios">Volver a usuarios</RouterLink></header><p v-if="message" class="feedback success" role="status">{{ message }}</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p><template v-if="result"><section class="settings-section"><header><h2>Identidad y estado</h2><p>Los cambios de correo en cuentas pendientes reenvían el acceso.</p></header><form class="editor-form settings-form" @submit.prevent="save"><label>Nombre <input v-model="profile.nombre" required /></label><label>Correo institucional <input v-model="profile.correo_electronico" type="email" required /></label><label class="checkbox-row"><input v-model="profile.active" type="checkbox" /> Cuenta activa</label><button :disabled="pending">Guardar cambios</button></form></section><section class="settings-section"><header><h2>Roles y alcances</h2><p>El historial inactivo se conserva para auditoría.</p></header><div class="table-wrap"><table><thead><tr><th>Rol</th><th>Carrera</th><th>Estado</th></tr></thead><tbody><tr v-for="assignment in result.managedUser.assignments" :key="assignment.id"><td>{{ assignment.role_name }}</td><td>{{ assignment.career_name ?? 'Institucional' }}</td><td>{{ assignment.active ? 'Vigente' : 'Finalizado' }}</td></tr></tbody></table></div><form class="editor-form settings-form" @submit.prevent="addRole"><h3>Asignar otro rol</h3><label>Rol <select v-model="role.role_code"><option v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</option></select></label><label v-if="role.role_code !== 'administrador'">Carrera <select v-model="role.career_id" required><option :value="null">Seleccione</option><option v-for="career in result.careers" :key="career.id" :value="career.id">{{ career.nombre }}</option></select></label><button :disabled="pending">Asignar rol</button></form></section></template></main></template>
