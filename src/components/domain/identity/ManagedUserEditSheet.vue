<script setup lang="ts">
import { Check, Pencil } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateManagedUser, type ManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = withDefaults(defineProps<{
    user: ManagedUser; roles: { codigo: string; nombre: string }[];
    careers: { id: string; nombre: string }[]; display?: 'button' | 'menu';
}>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ nombre: '', correo_electronico: '', active: true, role_code: '', career_id: '' });
const assignableRoles = computed(() => props.user.roles.some((role) => role.code === 'administrador')
    ? []
    : props.roles.filter((role) => role.codigo === 'docente'));
const coordinatedCareers = computed(() => props.user.roles
    .filter((role) => role.code === 'coordinador' && role.career_name)
    .map((role) => role.career_name as string));
const deactivating = computed(() => props.user.active && !form.value.active);
const reset = (): void => { form.value = { nombre: props.user.nombre, correo_electronico: props.user.correo_electronico, active: props.user.active, role_code: '', career_id: '' }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); }, { immediate: true });
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    const payload: { nombre: string; correo_electronico: string; active: boolean; role_code?: string; career_id?: string | null } = { nombre: form.value.nombre, correo_electronico: form.value.correo_electronico, active: form.value.active };
    if (form.value.role_code) { payload.role_code = form.value.role_code; payload.career_id = form.value.career_id; }
    try { const result = await updateManagedUser(props.user.id, payload); open.value = false; emit('saved', result.message); }
    catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <DropdownMenuItem v-if="display === 'menu'" @select="(event: Event) => { event.preventDefault(); open = true; }"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
    <FormSheet v-model:open="open" trigger-label="Editar cuenta" :title="`Editar ${user.nombre}`" description="Corrija su identidad, estado o agregue una nueva asignación de rol." :show-trigger="display !== 'menu'">
        <template #trigger><Button type="button" variant="outline"><Pencil />Editar cuenta</Button></template>
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`managed-edit-name-${user.id}`" required>Nombre completo</FieldLabel><Input :id="`managed-edit-name-${user.id}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`managed-edit-email-${user.id}`" required>Correo institucional</FieldLabel><Input :id="`managed-edit-email-${user.id}`" v-model="form.correo_electronico" type="email" required :disabled="!user.pending_activation" /><FieldDescription v-if="!user.pending_activation">La cuenta ya fue activada y su correo no se cambia. Si otra persona asume sus funciones, cree su cuenta y asígnele el rol.</FieldDescription><FieldError :errors="errors.correo_electronico" /></Field>
            <Field orientation="horizontal" :data-invalid="Boolean(errors.active)"><Checkbox :id="`managed-edit-active-${user.id}`" v-model="form.active" /><FieldContent><FieldLabel :for="`managed-edit-active-${user.id}`">Acceso habilitado</FieldLabel><FieldDescription>Permite o bloquea el ingreso al sistema.</FieldDescription><FieldDescription v-if="deactivating && coordinatedCareers.length > 0" class="text-destructive">Al guardar, {{ user.nombre }} dejará de coordinar {{ coordinatedCareers.join(', ') }}. Nombre a otra persona desde Carreras.</FieldDescription><FieldError :errors="errors.active" /></FieldContent></Field>
            <Field><FieldLabel>Estado de activación</FieldLabel><Badge :variant="user.pending_activation ? 'default' : 'secondary'">{{ user.pending_activation ? 'Pendiente de activación' : 'Activada' }}</Badge><FieldDescription v-if="user.pending_activation">La persona debe abrir la invitación y definir su contraseña.</FieldDescription><FieldDescription v-else>La persona ya verificó su correo y definió su contraseña.</FieldDescription></Field>
            <Field v-if="assignableRoles.length > 0" :data-invalid="Boolean(errors.role_code)"><FieldLabel :for="`managed-edit-role-${user.id}`">Agregar otro rol (opcional)</FieldLabel><Select v-model="form.role_code"><SelectTrigger :id="`managed-edit-role-${user.id}`"><SelectValue placeholder="No agregar otro rol" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in assignableRoles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="form.role_code" :data-invalid="Boolean(errors.career_id)"><FieldLabel :for="`managed-edit-career-${user.id}`" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger :id="`managed-edit-career-${user.id}`"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
