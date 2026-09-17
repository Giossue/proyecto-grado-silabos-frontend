<script setup lang="ts">
import { Check, Copy, Eye, EyeOff, RefreshCw, UserPlus } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createManagedUser } from '@/api/admin-users';
import { createCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateTemporaryPassword } from '@/lib/temporaryPassword';

const props = withDefaults(defineProps<{
    roles?: { codigo: string; nombre: string }[];
    careers?: { id: string; nombre: string }[];
    teacherCareer?: { id: string; name: string } | null;
    showTrigger?: boolean;
}>(), { roles: () => [], careers: () => [], teacherCareer: null, showTrigger: true });
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const passwordVisible = ref(false);
const form = ref({ nombre: '', correo_electronico: '', password: generateTemporaryPassword(), role_code: 'docente', career_id: '' });
const reset = (): void => { form.value = { nombre: '', correo_electronico: '', password: generateTemporaryPassword(), role_code: 'docente', career_id: '' }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); });
const copyPassword = async (): Promise<void> => { await navigator.clipboard.writeText(form.value.password); };
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    try {
        const result = props.teacherCareer
            ? await createCareerTeacher({ nombre: form.value.nombre, correo_electronico: form.value.correo_electronico, password: form.value.password })
            : await createManagedUser({ ...form.value, career_id: form.value.role_code === 'administrador' ? null : form.value.career_id });
        open.value = false; emit('saved', result.message);
    } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" :trigger-label="teacherCareer ? 'Crear docente' : 'Nueva cuenta'" :title="teacherCareer ? 'Crear docente' : 'Nueva cuenta'" :description="teacherCareer ? `Cree una cuenta nueva o incorpore una existente a ${teacherCareer.name} por su correo.` : 'La persona recibirá por correo su acceso temporal y deberá definir una contraseña propia al entrar.'" :show-trigger="showTrigger">
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="managed-user-name" required>Nombre completo</FieldLabel><Input id="managed-user-name" v-model="form.nombre" placeholder="Ej. ANA PÉREZ" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel for="managed-user-email" required>Correo institucional</FieldLabel><Input id="managed-user-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field :data-invalid="Boolean(errors.password)"><FieldLabel for="managed-user-password" required>Contraseña temporal</FieldLabel><div class="flex gap-2"><Input id="managed-user-password" v-model="form.password" :type="passwordVisible ? 'text' : 'password'" required /><Button type="button" variant="outline" size="icon" :aria-label="passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="passwordVisible = !passwordVisible"><EyeOff v-if="passwordVisible" /><Eye v-else /></Button><Button type="button" variant="outline" size="icon" aria-label="Copiar contraseña" @click="copyPassword"><Copy /></Button><Button type="button" variant="outline" size="icon" aria-label="Generar otra contraseña" @click="form.password = generateTemporaryPassword()"><RefreshCw /></Button></div><FieldDescription>Compártala solo por el canal institucional previsto.</FieldDescription><FieldError :errors="errors.password" /></Field>
            <Field v-if="!teacherCareer" :data-invalid="Boolean(errors.role_code)"><FieldLabel for="managed-user-role" required>Rol inicial</FieldLabel><Select v-model="form.role_code" required><SelectTrigger id="managed-user-role"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in roles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="!teacherCareer && form.role_code !== 'administrador'" :data-invalid="Boolean(errors.career_id)"><FieldLabel for="managed-user-career" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger id="managed-user-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="teacherCareer ? UserPlus : Check" :label="teacherCareer ? 'Guardar docente' : 'Crear cuenta'" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
