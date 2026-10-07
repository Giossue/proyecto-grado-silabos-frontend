<script setup lang="ts">
import { Check } from '@lucide/vue';
import { ref, watch } from 'vue';
import { updateCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const props = defineProps<{ teacher: { id: string; name: string; email: string; pending_activation: boolean } }>();
const emit = defineEmits<{ saved: [message: string] }>();
const open = defineModel<boolean>('open', { default: false });
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ nombre: '', correo_electronico: '' });
const reset = (): void => { form.value = { nombre: props.teacher.name, correo_electronico: props.teacher.email }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); }, { immediate: true });
const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    try {
        const result = await updateCareerTeacher(props.teacher.id, { nombre: form.value.nombre, correo_electronico: form.value.correo_electronico });
        open.value = false;
        emit('saved', result.message);
    } catch (reason) {
        errors.value = reason instanceof ApiError ? reason.errors : {};
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <FormSheet v-model:open="open" trigger-label="Editar docente" title="Editar docente" description="Corrija el nombre o el correo del docente. Solo cambia la cuenta, no sus paralelos." :show-trigger="false">
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`career-teacher-name-${teacher.id}`" required>Nombre completo</FieldLabel><Input :id="`career-teacher-name-${teacher.id}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`career-teacher-email-${teacher.id}`" required>Correo institucional</FieldLabel><Input :id="`career-teacher-email-${teacher.id}`" v-model="form.correo_electronico" type="email" required :disabled="!teacher.pending_activation" /><FieldDescription v-if="teacher.pending_activation">Al cambiar el correo, la invitación anterior deja de servir y se envía una nueva al correo corregido.</FieldDescription><FieldDescription v-else>La cuenta ya fue activada y su correo no se cambia. Si otra persona asume sus funciones, cree su cuenta y asígnela.</FieldDescription><FieldError :errors="errors.correo_electronico" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
