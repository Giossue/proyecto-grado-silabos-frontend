<script setup lang="ts">
import { UserPlus } from '@lucide/vue';
import { ref, watch } from 'vue';
import { createManagedUser } from '@/api/admin-users';
import { createCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormModal from '@/components/domain/FormModal.vue';
import FormDialogActions from '@/components/domain/FormDialogActions.vue';
import CoordinatorReplacementConfirm from '@/components/domain/identity/CoordinatorReplacementConfirm.vue';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cleanParts, NAME_PARTS, nameErrors, upperName, type NamePartKey } from '@/lib/personName';
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
const emptyForm = () => ({ nombres: '', apellidos: '', correo_electronico: '', role_code: 'docente', career_id: '' });
const form = ref(emptyForm());
const nameParts = NAME_PARTS;
const setPart = (key: NamePartKey, value: string | number): void => { form.value[key] = upperName(value); };
const reset = (): void => { form.value = emptyForm(); errors.value = {}; };
watch(open, (value) => { if (value) reset(); });
const replacement = ref<string | null>(null);
const submit = async (replaceCoordinator = false): Promise<void> => {
    const invalid = nameErrors(form.value);
    if (Object.keys(invalid).length > 0) { errors.value = invalid as Record<string, string[]>; return; }
    processing.value = true; errors.value = {};
    const names = cleanParts(form.value);
    try {
        const result = props.teacherCareer
            ? await createCareerTeacher({ ...names, correo_electronico: form.value.correo_electronico })
            : await createManagedUser({ ...names, correo_electronico: form.value.correo_electronico, role_code: form.value.role_code, career_id: roleNeedsCareer(form.value.role_code) ? form.value.career_id : null, ...(replaceCoordinator ? { replace_coordinator: true } : {}) });
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
    <FormModal v-model:open="open" :trigger-label="teacherCareer ? 'Crear docente' : 'Crear cuenta'" :title="teacherCareer ? 'Crear docente' : 'Crear cuenta institucional'" description="Le llegará un correo para activar su cuenta" :show-trigger="showTrigger">
        <template #default="{ close }"><form @submit.prevent="submit()"><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in nameParts" :key="part.key" :data-invalid="Boolean(errors[part.key])"><FieldLabel :for="`managed-user-${part.key}`" required>{{ part.label }}</FieldLabel><Input :id="`managed-user-${part.key}`" :model-value="form[part.key]" lang="es" autocapitalize="characters" :placeholder="part.placeholder" aria-required="true" @update:model-value="setPart(part.key, $event)" /><FieldError :errors="errors[part.key]" /></Field>
            </div>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel for="managed-user-email" required>Correo institucional</FieldLabel><Input id="managed-user-email" v-model="form.correo_electronico" type="email" placeholder="Ej. ana.perez@ueb.edu.ec" aria-required="true" /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field v-if="!teacherCareer" :data-invalid="Boolean(errors.role_code)"><FieldLabel for="managed-user-role" required>Rol inicial</FieldLabel><Select v-model="form.role_code" required><SelectTrigger id="managed-user-role"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in roles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="!teacherCareer && roleNeedsCareer(form.role_code)" :data-invalid="Boolean(errors.career_id)"><FieldLabel for="managed-user-career" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger id="managed-user-career"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormDialogActions :close="close" :processing="processing" :icon="UserPlus" :label="teacherCareer ? 'Crear docente' : 'Crear cuenta'" />
        </FieldGroup></form></template>
    </FormModal>
    <CoordinatorReplacementConfirm :message="replacement" :processing="processing" @confirm="submit(true)" @cancel="replacement = null" />
</template>
