<script setup lang="ts">
import { Check, Trash2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { removeManagedUserRole, updateManagedUser, type ManagedUser } from '@/api/admin-users';
import { ApiError } from '@/api/client';
import FormDialogActions from '@/components/domain/FormDialogActions.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import CoordinatorReplacementConfirm from '@/components/domain/identity/CoordinatorReplacementConfirm.vue';
import { Spinner } from '@/components/ui/spinner';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { joinName, NAME_PARTS, nameErrors, splitName, upperName, type NamePartKey } from '@/lib/personName';
import { useShownWhileClosing } from '@/lib/dialogExit';
import { roleNeedsCareer } from '@/lib/roles';

const props = defineProps<{
    user: ManagedUser; roles: { codigo: string; nombre: string }[];
    careers: { id: string; nombre: string }[];
}>();
const emit = defineEmits<{ saved: [message: string]; cancel: [] }>();
const processing = ref(false); const errors = ref<Record<string, string[]>>({});
const form = ref({ ...splitName(''), correo_electronico: '', role_code: '', career_id: '' });
const assignableRoles = computed(() => props.user.roles.some((role) => role.code === 'administrador')
    ? []
    : props.roles.filter((role) => role.codigo === 'docente' || role.codigo === 'coordinador'
        || (role.codigo === 'bibliotecario' && !props.user.roles.some((current) => current.code === 'bibliotecario'))));
const setPart = (key: NamePartKey, value: string | number): void => { form.value[key] = upperName(value); };
const fullName = computed(() => joinName(form.value));
// Los nombres antiguos con menos de cuatro palabras se pueden dejar como están; uno nuevo o corregido exige las cuatro partes.
const reset = (): void => { form.value = { ...splitName(props.user.nombre), correo_electronico: props.user.correo_electronico, role_code: '', career_id: '' }; errors.value = {}; };
reset();
watch(() => props.user.id, reset);
const unchanged = computed(() => fullName.value === joinName(splitName(props.user.nombre)) && form.value.correo_electronico === props.user.correo_electronico && !form.value.role_code);
const removing = ref<ManagedUser['roles'][number] | null>(null);
// Mientras se desvanece sigue nombrando el rol que se quitaba.
const shownRemoving = useShownWhileClosing(() => removing.value);
const removeProcessing = ref(false); const removeError = ref<string | null>(null);
const removeRole = async (): Promise<void> => {
    if (!removing.value) return;
    removeProcessing.value = true; removeError.value = null;
    try { const result = await removeManagedUserRole(props.user.id, removing.value.id); removing.value = null; emit('saved', result.message); }
    catch (reason) { removeError.value = reason instanceof ApiError ? (Object.values(reason.errors).flat()[0] ?? reason.message) : 'No se pudo quitar el rol'; }
    finally { removeProcessing.value = false; }
};
const replacement = ref<string | null>(null);
const submit = async (replaceCoordinator = false): Promise<void> => {
    // Un nombre antiguo que no cumple se puede dejar como está; si se cambia, se revisa como en el alta.
    const invalid = fullName.value === joinName(splitName(props.user.nombre)) ? {} : nameErrors(form.value);
    if (Object.keys(invalid).length > 0) { errors.value = { nombre: Object.values(invalid).flat() }; return; }
    processing.value = true; errors.value = {};
    const payload: { nombre: string; correo_electronico: string; role_code?: string; career_id?: string | null; replace_coordinator?: boolean } = { nombre: fullName.value, correo_electronico: form.value.correo_electronico };
    if (form.value.role_code) { payload.role_code = form.value.role_code; payload.career_id = roleNeedsCareer(form.value.role_code) ? form.value.career_id : null; }
    if (replaceCoordinator) payload.replace_coordinator = true;
    try { const result = await updateManagedUser(props.user.id, payload); replacement.value = null; emit('saved', result.message); }
    catch (reason) {
        const failed = reason instanceof ApiError ? reason.errors : {};
        replacement.value = failed.replace_coordinator?.[0] ?? null;
        if (replacement.value === null) errors.value = failed;
    }
    finally { processing.value = false; }
};
</script>

<template>
    <form @submit.prevent="submit()"><FieldGroup>
            <div class="grid grid-cols-2 items-start gap-4">
                <Field v-for="part in NAME_PARTS" :key="part.key" :data-invalid="Boolean(errors.nombre)"><FieldLabel :for="`managed-edit-${part.key}-${user.id}`" required>{{ part.label }}</FieldLabel><Input :id="`managed-edit-${part.key}-${user.id}`" :model-value="form[part.key]" lang="es" autocapitalize="characters" :placeholder="part.placeholder"  aria-required="true" @update:model-value="setPart(part.key, $event)" /></Field>
            </div>
            <FieldError :errors="errors.nombre" />
            <Field :data-invalid="Boolean(errors.correo_electronico)"><FieldLabel :for="`managed-edit-email-${user.id}`" required>Correo institucional</FieldLabel><Input :id="`managed-edit-email-${user.id}`" v-model="form.correo_electronico" type="email" aria-required="true" :disabled="!user.pending_activation" /><FieldError :errors="errors.correo_electronico" /></Field>
            <Field v-if="user.roles.length > 1"><FieldLabel>Roles vigentes</FieldLabel><ul class="flex flex-col gap-2"><li v-for="role in user.roles" :key="role.id" class="flex items-center justify-between gap-2 text-sm"><span>{{ role.name }}<span v-if="role.career_name" class="text-muted-foreground"> · {{ role.career_name }}</span></span><Button type="button" variant="ghost" size="sm" :aria-label="`Quitar el rol ${role.name}${role.career_name ? ' de ' + role.career_name : ''}`" @click="removing = role; removeError = null"><Trash2 aria-hidden="true" />Quitar</Button></li></ul></Field>
            <Field v-if="assignableRoles.length > 0" :data-invalid="Boolean(errors.role_code)"><FieldLabel :for="`managed-edit-role-${user.id}`">Agregar otro rol (opcional)</FieldLabel><Select v-model="form.role_code"><SelectTrigger :id="`managed-edit-role-${user.id}`"><SelectValue placeholder="No agregar otro rol" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="role in assignableRoles" :key="role.codigo" :value="role.codigo">{{ role.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.role_code" /></Field>
            <Field v-if="roleNeedsCareer(form.role_code)" :data-invalid="Boolean(errors.career_id)"><FieldLabel :for="`managed-edit-career-${user.id}`" required>Carrera</FieldLabel><Select v-model="form.career_id" required><SelectTrigger :id="`managed-edit-career-${user.id}`"><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="career in careers" :key="career.id" :value="career.id">{{ career.nombre }}</SelectItem></SelectGroup></SelectContent></Select><FieldError :errors="errors.career_id" /></Field>
            <FormDialogActions :close="() => emit('cancel')" :processing="processing" :disabled="unchanged" :icon="Check" label="Guardar cambios" />
    </FieldGroup></form>
    <Dialog :open="removing !== null" @update:open="(value: boolean) => { if (!value) removing = null; }"><DialogContent><DialogHeader><DialogTitle>Quitar rol</DialogTitle><DialogDescription>{{ user.nombre }} deja de ser {{ shownRemoving?.name }}{{ shownRemoving?.career_name ? ` de ${shownRemoving.career_name}` : '' }}. Su cuenta y sus otros roles no cambian y el rol queda en el historial. Si es docente, sus paralelos quedan sin docente</DialogDescription></DialogHeader>
        <FeedbackAlert v-if="removeError" :message="removeError" />
        <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="removeProcessing" @click="removeRole"><Spinner v-if="removeProcessing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Quitar rol</Button></DialogFooter>
    </DialogContent></Dialog>
    <CoordinatorReplacementConfirm :message="replacement" :processing="processing" @confirm="submit(true)" @cancel="replacement = null" />
</template>
