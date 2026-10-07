<script setup lang="ts">
import { Check, Pencil } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateManagedUser, type ManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roleNeedsCareer } from '@/lib/roles';

const props = withDefaults(defineProps<{
    user: ManagedUser; roles: { codigo: string; nombre: string }[];
    careers: { id: string; nombre: string }[]; display?: 'button' | 'menu' | 'none';
}>(), { display: 'button' });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ nombre: '', correo_electronico: '', role_code: '', career_id: '' });
const assignableRoles = computed(() => props.user.roles.some((role) => role.code === 'administrador')
    ? []
    : props.roles.filter((role) => role.codigo === 'docente'
        || (role.codigo === 'bibliotecario' && !props.user.roles.some((current) => current.code === 'bibliotecario'))));
const reset = (): void => { form.value = { nombre: props.user.nombre, correo_electronico: props.user.correo_electronico, role_code: '', career_id: '' }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); }, { immediate: true });
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    const payload: { nombre: string; correo_electronico: string; role_code?: string; career_id?: string | null } = { nombre: form.value.nombre, correo_electronico: form.value.correo_electronico };
    if (form.value.role_code) { payload.role_code = form.value.role_code; payload.career_id = roleNeedsCareer(form.value.role_code) ? form.value.career_id : null; }
    try { const result = await updateManagedUser(props.user.id, payload); open.value = false; emit('saved', result.message); }
    catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <DropdownMenuItem v-if="display === 'menu'" @select="(event: Event) => { event.preventDefault(); open = true; }"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
    <FormSheet v-model:open="open" trigger-label="Editar cuenta" :title="`Editar ${user.nombre}`" description="Corrija su identidad, estado o agregue una nueva asignación de rol." :show-trigger="display === 'button'">
        <template #trigger><Button type="button" variant="outline"><Pencil />Editar cuenta</Button></template>
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`managed-edit-name-${user.id}`" required>Nombre completo</FieldLabel><Input :id="`managed-edit-name-${user.id}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`managed-edit-email-${user.id}`" required>Correo institucional</FieldLabel><Input :id="`managed-edit-email-${user.id}`" v-model="form.correo_electronico" type="email" required :disabled="!user.pending_activation" /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field><FieldLabel>Estado de activación</FieldLabel><div><Badge :variant="user.pending_activation ? 'default' : 'secondary'">{{ user.pending_activation ? 'Pendiente de activación' : 'Activada' }}</Badge></div></Field>
            <Field v-if="assignableRoles.length > 0" :data-invalid="Boolean(errors.role_code)"><FieldLabel :for="`managed-edit-role-${user.id}`">Agregar otro rol (opcional)</FieldLabel><Select v-model="form.role_code"><SelectTrigger :id="`managed-edit-role-${user.id}`"><SelectValue placeholder="No agregar otro rol" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in assignableRoles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="roleNeedsCareer(form.role_code)" :data-invalid="Boolean(errors.career_id)"><FieldLabel :for="`managed-edit-career-${user.id}`" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger :id="`managed-edit-career-${user.id}`"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
