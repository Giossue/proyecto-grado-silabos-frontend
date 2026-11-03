<script setup lang="ts">
import { UserMinus } from '@lucide/vue';
import { computed } from 'vue';
import FormSheet from '@/components/domain/FormSheet.vue';
import SheetActions, { type SheetAction } from '@/components/domain/SheetActions.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NAME_PARTS, splitName } from '@/lib/personName';

// Coordinación solo agrega docentes y los quita de su carrera: la cuenta no se edita aquí.
const props = defineProps<{
    teacher: { id: string; name: string; email: string; pending_activation: boolean };
    removeDisabled?: boolean;
}>();
const emit = defineEmits<{ remove: [] }>();
const open = defineModel<boolean>('open', { default: false });
const actions = computed<SheetAction[]>(() => [
    { key: 'remove', label: 'Quitar de la carrera', icon: UserMinus, destructive: true, disabled: props.removeDisabled, disabledReason: 'No se puede quitar mientras la convocatoria esté en curso' },
]);
const parts = computed(() => splitName(props.teacher.name));
</script>

<template>
    <FormSheet v-model:open="open" trigger-label="Docente" title="Docente" :show-trigger="false">
        <template #header-actions>
            <SheetActions :actions="actions" :menu-label="`Acciones para ${teacher.name}`" @select="emit('remove')" />
        </template>
        <template #default="{ close }"><form @submit.prevent><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in NAME_PARTS" :key="part.key"><FieldLabel :for="`career-teacher-${part.key}-${teacher.id}`">{{ part.label }}</FieldLabel><Input :id="`career-teacher-${part.key}-${teacher.id}`" :model-value="parts[part.key]" disabled /></Field>
            </div>
            <Field><FieldLabel :for="`career-teacher-email-${teacher.id}`">Correo institucional</FieldLabel><Input :id="`career-teacher-email-${teacher.id}`" :model-value="teacher.email" type="email" disabled /><FieldDescription>Para corregir el nombre o el correo, o reenviar la invitación, solicítelo a Administración</FieldDescription></Field>
            <FormSheetActions :close="close" close-only />
        </FieldGroup></form></template>
    </FormSheet>
</template>
