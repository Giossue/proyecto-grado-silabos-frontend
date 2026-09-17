<script setup lang="ts">
import { ShieldCheck } from '@lucide/vue';
import { ref } from 'vue';
import { assignManagedUserRole } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const props = defineProps<{ managedUserId: string; roles: { codigo: string; nombre: string }[]; careers: { id: string; nombre: string }[] }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = ref(false); const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const roleCode = ref('docente'); const careerId = ref('');
const submit = async (): Promise<void> => { processing.value = true; errors.value = {}; try { const result = await assignManagedUserRole(props.managedUserId, { role_code: roleCode.value, career_id: roleCode.value === 'administrador' ? null : careerId.value }); open.value = false; roleCode.value = 'docente'; careerId.value = ''; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet v-model:open="open" trigger-label="Asignar rol" title="Asignar otro rol" description="La nueva asignación se agrega sin borrar el historial anterior.">
    <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup><Field :data-invalid="Boolean(errors.role_code)"><FieldLabel :for="`role-code-${managedUserId}`" required>Rol</FieldLabel><Select v-model="roleCode" required><SelectTrigger :id="`role-code-${managedUserId}`"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in roles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field><Field v-if="roleCode !== 'administrador'" :data-invalid="Boolean(errors.career_id)"><FieldLabel :for="`role-career-${managedUserId}`" required>Carrera</FieldLabel><Select v-model="careerId" required><SelectTrigger :id="`role-career-${managedUserId}`"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field><FormSheetActions :close="close" :processing="processing" :icon="ShieldCheck" label="Asignar rol" /></FieldGroup></form></template>
</FormSheet></template>
