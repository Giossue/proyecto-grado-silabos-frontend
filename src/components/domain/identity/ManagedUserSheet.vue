<script setup lang="ts">
import { UserPlus } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createManagedUser } from '@/api/admin-users';
import { createCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { roleNeedsCareer } from '@/lib/roles';

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
const form = ref({ nombre: '', correo_electronico: '', role_code: 'docente', career_id: '' });
const reset = (): void => { form.value = { nombre: '', correo_electronico: '', role_code: 'docente', career_id: '' }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); });
const submit = async (): Promise<void> => {
    processing.value = true; errors.value = {};
    try {
        const result = props.teacherCareer
            ? await createCareerTeacher({ nombre: form.value.nombre, correo_electronico: form.value.correo_electronico })
            : await createManagedUser({ ...form.value, career_id: roleNeedsCareer(form.value.role_code) ? form.value.career_id : null });
        open.value = false; emit('saved', result.message);
    } catch (reason) { errors.value = reason instanceof ApiError ? reason.errors : {}; }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" :trigger-label="teacherCareer ? 'Crear docente' : 'Crear cuenta'" :title="teacherCareer ? 'Crear docente para su carrera' : 'Crear cuenta institucional'" :description="teacherCareer ? `Registre un docente para ${teacherCareer.name}. Si el correo ya tiene una cuenta, se incorporará conservando su nombre y acceso actuales.` : 'Registre una cuenta con su rol inicial y, si el rol la pide, su carrera. La persona recibirá un enlace para verificar su correo y definir su contraseña.'" :show-trigger="showTrigger">
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel for="managed-user-name" required>Nombre completo</FieldLabel><Input id="managed-user-name" v-model="form.nombre" placeholder="Ej. ANA PÉREZ" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel for="managed-user-email" required>Correo institucional</FieldLabel><Input id="managed-user-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field v-if="!teacherCareer" :data-invalid="Boolean(errors.role_code)"><FieldLabel for="managed-user-role" required>Rol inicial</FieldLabel><Select v-model="form.role_code" required><SelectTrigger id="managed-user-role"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in roles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="!teacherCareer && roleNeedsCareer(form.role_code)" :data-invalid="Boolean(errors.career_id)"><FieldLabel for="managed-user-career" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger id="managed-user-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="UserPlus" :label="teacherCareer ? 'Crear o incorporar docente' : 'Crear cuenta'" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
