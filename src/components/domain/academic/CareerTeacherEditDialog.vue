<script setup lang="ts">
import { MailCheck, UserMinus } from '@lucide/vue';
import { computed } from 'vue';
import FormModal from '@/components/domain/FormModal.vue';
import DialogActions, { type DialogAction } from '@/components/domain/DialogActions.vue';
import FormDialogActions from '@/components/domain/FormDialogActions.vue';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NAME_PARTS, splitName } from '@/lib/personName';

// Coordinación solo agrega docentes y los quita de su carrera: la cuenta no se edita aquí.
const props = defineProps<{
    teacher: { id: string; name: string; email: string; pending_activation: boolean; invitation_expired: boolean };
    removeDisabled?: boolean;
}>();
const emit = defineEmits<{ remove: []; resend: [] }>();
const open = defineModel<boolean>('open', { default: false });
// Reenviar la invitación solo cuando venció sin aceptarse; el enlace llega al correo del docente.
const actions = computed<DialogAction[]>(() => [
    ...(props.teacher.pending_activation && props.teacher.invitation_expired ? [{ key: 'resend', label: 'Reenviar invitación', icon: MailCheck }] : []),
    { key: 'remove', label: 'Quitar de la carrera', icon: UserMinus, destructive: true, disabled: props.removeDisabled, disabledReason: 'No se puede quitar mientras la convocatoria esté en curso' },
]);
const parts = computed(() => splitName(props.teacher.name));
</script>

<template>
    <FormModal v-model:open="open" trigger-label="Docente" title="Docente" :show-trigger="false">
        <template #header-actions>
            <DialogActions :actions="actions" :menu-label="`Acciones para ${teacher.name}`" @select="(key: string) => key === 'resend' ? emit('resend') : emit('remove')" />
        </template>
        <template #default="{ close }"><form @submit.prevent><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in NAME_PARTS" :key="part.key"><FieldLabel :for="`career-teacher-${part.key}-${teacher.id}`">{{ part.label }}</FieldLabel><Input :id="`career-teacher-${part.key}-${teacher.id}`" :model-value="parts[part.key]" disabled /></Field>
            </div>
            <Field><FieldLabel :for="`career-teacher-email-${teacher.id}`">Correo institucional</FieldLabel><Input :id="`career-teacher-email-${teacher.id}`" :model-value="teacher.email" type="email" disabled /><FieldDescription>Para corregir el nombre o el correo, solicítelo a Administración</FieldDescription></Field>
            <FormDialogActions :close="close" close-only />
        </FieldGroup></form></template>
    </FormModal>
</template>
