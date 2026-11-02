<script setup lang="ts">
import { Check, MailCheck, UserMinus } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { updateCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import SheetActions, { type SheetAction } from '@/components/domain/SheetActions.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { joinName, NAME_PARTS, splitName, upperName, type NamePartKey } from '@/lib/personName';

const props = defineProps<{
    teacher: { id: string; name: string; email: string; pending_activation: boolean };
    removeDisabled?: boolean;
    resending?: boolean;
}>();
const emit = defineEmits<{ saved: [message: string]; remove: []; resend: [] }>();
const open = defineModel<boolean>('open', { default: false });
const actions = computed<SheetAction[]>(() => [
    ...(props.teacher.pending_activation ? [{ key: 'resend', label: 'Reenviar invitación', icon: MailCheck, loading: props.resending }] : []),
    { key: 'remove', label: 'Quitar de la carrera', icon: UserMinus, destructive: true, disabled: props.removeDisabled, disabledReason: 'No se puede quitar mientras la convocatoria esté en curso' },
]);
const select = (key: string): void => { if (key === 'resend') emit('resend'); else emit('remove'); };
const processing = ref(false);
const errors = ref<Record<string, string[]>>({});
const form = ref({ ...splitName(''), correo_electronico: '' });
const setPart = (key: NamePartKey, value: string | number): void => { form.value[key] = upperName(value); };
const fullName = computed(() => joinName(form.value));
const requiresAllParts = computed(() => props.teacher.name.trim().split(/\s+/u).length >= 4);
const reset = (): void => { form.value = { ...splitName(props.teacher.name), correo_electronico: props.teacher.email }; errors.value = {}; };
watch(open, (value) => { if (value) reset(); }, { immediate: true });
const unchanged = computed(() => fullName.value === joinName(splitName(props.teacher.name)) && form.value.correo_electronico === props.teacher.email);
const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    try {
        const result = await updateCareerTeacher(props.teacher.id, { nombre: fullName.value, correo_electronico: form.value.correo_electronico });
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
    <FormSheet v-model:open="open" trigger-label="Editar docente" :title="teacher.pending_activation ? 'Editar docente' : 'Docente'" :show-trigger="false">
        <template #header-actions>
            <SheetActions :actions="actions" :menu-label="`Acciones para ${teacher.name}`" @select="select" />
        </template>
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in NAME_PARTS" :key="part.key" :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`career-teacher-${part.key}-${teacher.id}`" required>{{ part.label }}</FieldLabel><Input :id="`career-teacher-${part.key}-${teacher.id}`" :model-value="form[part.key]" lang="es" autocapitalize="characters" :placeholder="part.placeholder" :aria-required="requiresAllParts" :disabled="!teacher.pending_activation" @update:model-value="setPart(part.key, $event)" /></Field>
            </div>
            <FieldError :errors="errors.nombre" />
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`career-teacher-email-${teacher.id}`" required>Correo institucional</FieldLabel><Input :id="`career-teacher-email-${teacher.id}`" v-model="form.correo_electronico" type="email" aria-required="true" :disabled="!teacher.pending_activation" /><FieldDescription v-if="teacher.pending_activation">Al cambiar el correo, la invitación anterior deja de servir y se envía una nueva al correo corregido</FieldDescription><FieldError :errors="errors.correo_electronico" /></Field>
            <FormSheetActions :close="close" :processing="processing" :disabled="unchanged" :icon="Check" label="Guardar cambios" :close-only="!teacher.pending_activation" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
