<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { assignManagedUserRole, getManagedUser, updateManagedUser, type ManagedUserDetailResponse } from '@/api/admin-users';
import PageFrame from '@/components/domain/PageFrame.vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const route = useRoute();
const result = ref<ManagedUserDetailResponse | null>(null);
const loading = ref(true);
const profile = ref({ nombre: '', correo_electronico: '', active: true });
const role = ref({ role_code: 'docente', career_id: null as string | null });
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);
const userId = String(route.params.user);

const load = async (): Promise<void> => {
  loading.value = true;
  try { result.value = await getManagedUser(userId); profile.value = { nombre: result.value.managedUser.nombre, correo_electronico: result.value.managedUser.correo_electronico, active: result.value.managedUser.active }; }
  catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cargar la cuenta.'; }
  finally { loading.value = false; }
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

<template><PageFrame :title="result?.managedUser.nombre ?? 'Detalle de cuenta'" :description="result?.managedUser.correo_electronico ?? 'Cargando información de la cuenta…'">
  <template #eyebrow><Button as-child variant="link" class="h-auto px-0"><RouterLink to="/administracion/usuarios">← Volver a usuarios</RouterLink></Button></template>
  <template v-if="result" #meta><Badge :variant="result.managedUser.active ? 'secondary' : 'outline'">{{ result.managedUser.active ? 'Cuenta activa' : 'Cuenta inactiva' }}</Badge></template>
  <template v-if="result" #actions>
    <FormSheet trigger-label="Editar perfil" title="Editar perfil" description="Actualice la identidad y el estado de esta cuenta."><template #default="{ close }"><form class="space-y-5" @submit.prevent="save"><Field><FieldLabel for="detail-name" required>Nombre completo</FieldLabel><Input id="detail-name" v-model="profile.nombre" required /></Field><Field><FieldLabel for="detail-email" required>Correo institucional</FieldLabel><Input id="detail-email" v-model="profile.correo_electronico" type="email" required /></Field><Field orientation="horizontal"><Checkbox id="detail-active" v-model="profile.active" /><FieldLabel for="detail-active">Cuenta activa</FieldLabel></Field><FormSheetActions label="Guardar cambios" :close="close" :processing="pending" /></form></template></FormSheet>
    <FormSheet trigger-label="Asignar rol" title="Asignar otro rol" description="El historial anterior se conserva para auditoría."><template #default="{ close }"><form class="space-y-5" @submit.prevent="addRole"><Field><FieldLabel for="detail-role" required>Rol</FieldLabel><Select v-model="role.role_code"><SelectTrigger id="detail-role"><SelectValue /></SelectTrigger><SelectContent><SelectItem v-for="item in result.roles" :key="item.codigo" :value="item.codigo">{{ item.nombre }}</SelectItem></SelectContent></Select></Field><Field v-if="role.role_code !== 'administrador'"><FieldLabel for="detail-career" required>Carrera</FieldLabel><Select v-model="role.career_id"><SelectTrigger id="detail-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectItem v-for="career in result.careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectContent></Select></Field><FormSheetActions label="Asignar rol" :close="close" :processing="pending" /></form></template></FormSheet>
  </template>
  <p v-if="message" class="text-sm" role="status">{{ message }}</p><p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p><p v-if="loading && !result" class="text-sm text-muted-foreground" role="status">Cargando cuenta…</p>
  <Card v-if="result"><CardHeader><CardTitle>Historial de roles</CardTitle><CardDescription>Las asignaciones anteriores se conservan para trazabilidad.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Rol</TableHead><TableHead>Alcance</TableHead><TableHead>Estado efectivo</TableHead></TableRow></TableHeader><TableBody><TableEmpty v-if="result.managedUser.assignments.length === 0" :colspan="3">No existen asignaciones.</TableEmpty><TableRow v-for="assignment in result.managedUser.assignments" v-else :key="assignment.id"><TableCell>{{ assignment.role_name }}</TableCell><TableCell>{{ assignment.career_name ?? 'Institucional' }}</TableCell><TableCell>{{ assignment.active ? 'Activo' : 'Finalizada' }}</TableCell></TableRow></TableBody></Table></CardContent></Card>
</PageFrame></template>
