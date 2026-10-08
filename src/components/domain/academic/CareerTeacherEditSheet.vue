<script setup lang="ts">
import { Check, MailCheck, UserMinus } from '@lucide/vue';
import { ref, watch } from 'vue';
import { updateCareerTeacher } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import FormSheet from '@/components/domain/FormSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const props = defineProps<{
    teacher: { id: string; name: string; email: string; pending_activation: boolean };
    removeDisabled?: boolean;
    resending?: boolean;
}>();
const emit = defineEmits<{ saved: [message: string]; remove: []; resend: [] }>();
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
    <FormSheet v-model:open="open" trigger-label="Editar docente" title="Editar docente" description="Corrija el nombre o el correo del docente." :show-trigger="false">
        <template #header-actions>
            <TableActionsMenu v-if="teacher.pending_activation" :label="`Acciones para ${teacher.name}`">
                <DropdownMenuItem :disabled="resending" @select="emit('resend')"><Spinner v-if="resending" data-icon="inline-start" /><MailCheck v-else data-icon="inline-start" aria-hidden="true" />Reenviar invitación</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" :disabled="removeDisabled" @select="emit('remove')"><UserMinus aria-hidden="true" />Quitar de la carrera</DropdownMenuItem>
            </TableActionsMenu>
            <TooltipProvider v-else>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button type="button" variant="ghost" size="icon-sm" class="text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label="Quitar de la carrera" :disabled="removeDisabled" @click="emit('remove')"><UserMinus aria-hidden="true" /></Button>
                    </TooltipTrigger>
                    <TooltipContent>Quitar de la carrera</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </template>
        <template #default="{ close }"><form @submit.prevent="submit"><FieldGroup>
            <Field :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`career-teacher-name-${teacher.id}`" required>Nombre completo</FieldLabel><Input :id="`career-teacher-name-${teacher.id}`" v-model="form.nombre" required /><FieldError :errors="errors.nombre" /></Field>
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`career-teacher-email-${teacher.id}`" required>Correo institucional</FieldLabel><Input :id="`career-teacher-email-${teacher.id}`" v-model="form.correo_electronico" type="email" required :disabled="!teacher.pending_activation" /><FieldDescription v-if="teacher.pending_activation">Al cambiar el correo, la invitación anterior deja de servir y se envía una nueva al correo corregido.</FieldDescription><FieldDescription v-else>La cuenta ya fue activada y su correo no se cambia. Si otra persona asume sus funciones, cree su cuenta y asígnela.</FieldDescription><FieldError :errors="errors.correo_electronico" /></Field>
            <FormSheetActions :close="close" :processing="processing" :icon="Check" label="Guardar cambios" />
        </FieldGroup></form></template>
    </FormSheet>
</template>
