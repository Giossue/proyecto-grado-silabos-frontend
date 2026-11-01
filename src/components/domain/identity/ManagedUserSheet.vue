<script setup lang="ts">
import { UserPlus } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createManagedUser } from '@/api/admin-users';
import { createCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import CoordinatorReplacementConfirm from '@/components/domain/identity/CoordinatorReplacementConfirm.vue';
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
const emptyForm = () => ({ primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', correo_electronico: '', role_code: 'docente', career_id: '' });
const form = ref(emptyForm());
const nameParts = [
    { key: 'primer_nombre', label: 'Primer nombre', placeholder: 'Ej. ANA' },
    { key: 'segundo_nombre', label: 'Segundo nombre', placeholder: 'Ej. MARÍA' },
    { key: 'primer_apellido', label: 'Primer apellido', placeholder: 'Ej. PÉREZ' },
    { key: 'segundo_apellido', label: 'Segundo apellido', placeholder: 'Ej. LÓPEZ' },
] as const;
const setPart = (key: (typeof nameParts)[number]['key'], value: string | number): void => { form.value[key] = String(value).normalize('NFC').toLocaleUpperCase('es-EC'); };
const reset = (): void => { form.value = emptyForm(); errors.value = {}; };
watch(open, (value) => { if (value) reset(); });
const replacement = ref<string | null>(null);
const submit = async (replaceCoordinator = false): Promise<void> => {
    processing.value = true; errors.value = {};
    try {
        const result = props.teacherCareer
            ? await createCareerTeacher({ primer_nombre: form.value.primer_nombre, segundo_nombre: form.value.segundo_nombre, primer_apellido: form.value.primer_apellido, segundo_apellido: form.value.segundo_apellido, correo_electronico: form.value.correo_electronico })
            : await createManagedUser({ primer_nombre: form.value.primer_nombre, segundo_nombre: form.value.segundo_nombre, primer_apellido: form.value.primer_apellido, segundo_apellido: form.value.segundo_apellido, correo_electronico: form.value.correo_electronico, role_code: form.value.role_code, career_id: roleNeedsCareer(form.value.role_code) ? form.value.career_id : null, ...(replaceCoordinator ? { replace_coordinator: true } : {}) });
        replacement.value = null; open.value = false; emit('saved', result.message);
    } catch (reason) {
        const failed = reason instanceof ApiError ? reason.errors : {};
        replacement.value = failed.replace_coordinator?.[0] ?? null;
        if (replacement.value === null) errors.value = failed;
    }
    finally { processing.value = false; }
};
</script>

<template>
    <FormSheet v-model:open="open" :trigger-label="teacherCareer ? 'Crear docente' : 'Crear cuenta'" :title="teacherCareer ? 'Crear docente' : 'Crear cuenta institucional'" :show-trigger="showTrigger">
        <template #default="{ close }"><form @submit.prevent="submit()"><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in nameParts" :key="part.key" :data-invalid="Boolean(errors[part.key])"><FieldLabel :for="`managed-user-${part.key}`" required>{{ part.label }}</FieldLabel><Input :id="`managed-user-${part.key}`" :model-value="form[part.key]" lang="es" autocapitalize="characters" :placeholder="part.placeholder" required @update:model-value="setPart(part.key, $event)" /><FieldError :errors="errors[part.key]" /></Field>
            </div>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel for="managed-user-email" required>Correo institucional</FieldLabel><Input id="managed-user-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" required /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field v-if="!teacherCareer" :data-invalid="Boolean(errors.role_code)"><FieldLabel for="managed-user-role" required>Rol inicial</FieldLabel><Select v-model="form.role_code" required><SelectTrigger id="managed-user-role"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in roles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="!teacherCareer && roleNeedsCareer(form.role_code)" :data-invalid="Boolean(errors.career_id)"><FieldLabel for="managed-user-career" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger id="managed-user-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="UserPlus" :label="teacherCareer ? 'Crear docente' : 'Crear cuenta'" />
        </FieldGroup></form></template>
    </FormSheet>
    <CoordinatorReplacementConfirm :message="replacement" :processing="processing" @confirm="submit(true)" @cancel="replacement = null" />
</template>
