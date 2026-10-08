<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
import { Pencil } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import type { ManagedUser } from '@/api/admin-users';
import ManagedUserEditForm from '@/components/domain/identity/ManagedUserEditForm.vue';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

export type ManagedUserRoleAssignment = {
    id: string;
    role_name: string;
    career_name: string | null;
    active: boolean;
};

export type ManagedUserRow = {
    id: string;
    nombre: string;
    correo_electronico: string;
    active: boolean;
    pending_activation: boolean;
    two_factor_enabled: boolean;
    roles: { name: string; career_name: string | null }[];
    careers: (string | null)[];
    assignments: ManagedUserRoleAssignment[];
};

const props = defineProps<{
    user: ManagedUser;
    roles: { codigo: string; nombre: string }[];
    careers: { id: string; nombre: string }[];
    canEdit: boolean;
}>();
const emit = defineEmits<{ saved: [message: string] }>();

const open = defineModel<boolean>('open', { default: false });
const editing = ref(false);
watch(open, (value) => { if (!value) editing.value = false; });
const saved = (message: string): void => {
    editing.value = false;
    open.value = false;
    emit('saved', message);
};

const status = computed(() => {
    if (!props.user.active) {
        return {
            label: 'Inactivo',
            hint: 'La cuenta está desactivada y no puede iniciar sesión.',
        };
    }

    if (props.user.pending_activation) {
        return {
            label: 'Pendiente de activación',
            hint: 'La cuenta espera que su titular abra la invitación y defina su contraseña.',
        };
    }

    return {
        label: 'Activo',
        hint: 'La cuenta está en uso y su titular ya definió su contraseña.',
    };
});

const scopeOf = (assignment: ManagedUserRoleAssignment): string =>
    assignment.career_name ?? 'Todas las carreras';

const currentAssignments = computed(() =>
    props.user.assignments.filter((assignment) => assignment.active),
);
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent side="right" class="w-full sm:max-w-lg">
            <SheetHeader>
                <SheetTitle>{{ editing ? 'Editar usuario' : 'Datos de la cuenta' }}</SheetTitle>
                <SheetDescription :class="editing ? '' : 'sr-only'">{{ editing ? 'Corrija su identidad, quite un rol o agregue una nueva asignación' : 'Ficha de solo lectura de la cuenta' }}</SheetDescription>
            </SheetHeader>

            <div v-if="editing" class="flex-1 overflow-y-auto px-4 pt-1 pb-28">
                <ManagedUserEditForm :user="props.user" :roles="roles" :careers="careers" @saved="saved" @cancel="editing = false" />
            </div>

            <div v-else class="flex flex-1 flex-col gap-6 overflow-y-auto px-4 pt-1 pb-28">
                <dl class="grid gap-3 text-sm">
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Estado</dt>
                        <dd class="flex flex-col items-start gap-1">
                            <span>{{ status.label }}</span>
                            <span class="text-muted-foreground">{{ withoutEndPeriod(status.hint) }}</span>
                        </dd>
                    </div>
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Nombre completo</dt>
                        <dd>{{ props.user.nombre }}</dd>
                    </div>
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Correo institucional</dt>
                        <dd>{{ props.user.correo_electronico }}</dd>
                    </div>
                    <div class="flex flex-col gap-1">
                        <dt class="font-semibold">Acceso en dos pasos</dt>
                        <dd>
                            {{ props.user.two_factor_enabled ? 'Configurado por su titular' : 'Sin configurar' }}
                        </dd>
                    </div>
                </dl>

                <Separator />

                <section class="flex flex-col gap-2">
                    <h3 class="text-sm font-medium">Roles vigentes</h3>
                    <p v-if="currentAssignments.length === 0" class="text-sm text-muted-foreground">
                        Sin rol vigente: la cuenta no accede a ningún módulo.
                    </p>
                    <ul v-else class="flex flex-col gap-3 text-sm">
                        <li v-for="assignment in currentAssignments" :key="assignment.id" class="flex flex-col gap-1">
                            <span class="font-medium">{{ assignment.role_name }}</span>
                            <span class="text-muted-foreground">{{ scopeOf(assignment) }}</span>
                        </li>
                    </ul>
                </section>

            </div>

            <SheetFooter v-if="!editing" class="absolute inset-x-0 bottom-0 border-t bg-card pb-(--safe-footer-inset)">
                <Field orientation="horizontal" class="justify-end">
                    <Button type="button" variant="outline" @click="open = false">Cerrar</Button>
                    <Button v-if="canEdit" type="button" @click="editing = true">
                        <Pencil data-icon="inline-start" aria-hidden="true" />
                        Editar
                    </Button>
                </Field>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
