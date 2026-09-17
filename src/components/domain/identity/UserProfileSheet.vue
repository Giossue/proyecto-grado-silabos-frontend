<script setup lang="ts">
import { Check, Pencil } from '@lucide/vue';
import { ref, watch } from 'vue';
import { updateManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const props = defineProps<{ userId: string; nombre: string; correo_electronico: string }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = ref(false); const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ nombre: props.nombre, correo_electronico: props.correo_electronico });
watch(open, (value) => { if (value) form.value = { nombre: props.nombre, correo_electronico: props.correo_electronico }; });
const submit = async (): Promise<void> => { processing.value = true; errors.value = {}; try { const result = await updateManagedUser(props.userId, form.value); open.value = false; emit('saved', result.message); } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; } finally { processing.value = false; } };
</script>

<template><FormSheet v-model:open="open" trigger-label="Editar perfil" title="Editar perfil" description="Actualice el nombre o el correo institucional de la cuenta.">
    <template #trigger><Button type="button" variant="outline"><Pencil />Editar perfil</Button></template>
    <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup><Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`profile-name-${userId}`" required>Nombre completo</FieldLabel><Input :id="`profile-name-${userId}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field><Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`profile-email-${userId}`" required>Correo institucional</FieldLabel><Input :id="`profile-email-${userId}`" v-model="form.correo_electronico" type="email" required /><FieldError :errors="errors.correo_electronico" /></Field><FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" /></FieldGroup></form></template>
</FormSheet></template>
