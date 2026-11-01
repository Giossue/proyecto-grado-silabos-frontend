<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge, { type StatusTone } from '@/components/domain/StatusBadge.vue';
import { Ban, CircleCheck, MailCheck, Pencil, Trash2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import type { ManagedUser } from '@/api/admin-users';
import SheetActions, { type SheetAction } from '@/components/domain/SheetActions.vue';
import ManagedUserEditForm from '@/components/domain/identity/ManagedUserEditForm.vue';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
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
const emit = defineEmits<{ saved: [message: string]; action: [key: 'access' | 'resend' | 'delete'] }>();

const open = defineModel<boolean>('open', { default: false });
const editing = ref(false);
const actions = computed<SheetAction[]>(() => {
    if (!props.canEdit) return [];
    if (props.user.pending_activation) {
        return props.user.active
            ? [
                { key: 'resend', label: 'Reenviar invitación', icon: MailCheck },
                { key: 'delete', label: 'Eliminar cuenta pendiente', icon: Trash2, destructive: true },
            ]
            : [];
    }

    return [props.user.active
        ? { key: 'access', label: 'Deshabilitar acceso', icon: Ban, destructive: true }
        : { key: 'access', label: 'Habilitar acceso', icon: CircleCheck }];
});
const runAction = (key: string): void => {
    open.value = false;
    emit('action', key as 'access' | 'resend' | 'delete');
};
watch(open, (value) => { if (!value) editing.value = false; });
const saved = (message: string): void => {
    editing.value = false;
    open.value = false;
    emit('saved', message);
};

const status = computed(() => {
    if (!props.user.active) return { label: 'Inactivo', tone: 'neutral' as StatusTone };
    if (props.user.pending_activation) return { label: 'Pendiente', tone: 'warning' as StatusTone };

    return { label: 'Activo', tone: 'success' as StatusTone };
});

const scopeOf = (assignment: ManagedUserRoleAssignment): string =>
    assignment.career_name ?? 'Todas las carreras';

const currentAssignments = computed(() =>
    props.user.assignments.filter((assignment) => assignment.active),
);
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent :aria-describedby="undefined" class="sm:max-w-lg">
            <SheetHeader class="pb-0">
                <SheetTitle>{{ editing ? 'Editar usuario' : 'Datos de la cuenta' }}</SheetTitle>
            </SheetHeader>

            <ScrollArea v-if="editing" class="min-h-0 flex-1">
                <div class="px-4 pt-1 pb-28">
                    <ManagedUserEditForm :user="props.user" :roles="roles" :careers="careers" @saved="saved" @cancel="editing = false" />
                </div>
            </ScrollArea>

            <ScrollArea v-else class="min-h-0 flex-1">
                <div class="flex flex-col gap-6 px-4 pt-1 pb-28">
                    <dl class="grid gap-3 text-sm">
                        <div class="flex flex-col gap-1">
                            <dt class="font-semibold">Estado</dt>
                            <dd><StatusBadge :label="status.label" :tone="status.tone" /></dd>
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
                        <h3 class="text-sm font-semibold">Roles vigentes</h3>
                        <p v-if="currentAssignments.length === 0" class="text-sm">
                            Sin rol vigente: la cuenta no accede a ningún módulo
                        </p>
                        <ul v-else class="flex flex-col gap-4 text-sm">
                            <li v-for="assignment in currentAssignments" :key="assignment.id" class="flex flex-col gap-0.5 border-l-2 border-primary/40 pl-3">
                                <span class="font-semibold">{{ assignment.role_name }}</span>
                                <span>{{ scopeOf(assignment) }}</span>
                            </li>
                        </ul>
                    </section>

                </div>
            </ScrollArea>

            <div v-if="!editing && actions.length > 0" class="absolute top-3 right-3 flex items-center gap-1">
                <SheetActions :actions="actions" :menu-label="`Acciones para ${props.user.nombre}`" @select="runAction" />
            </div>

            <SheetFooter v-if="!editing" class="absolute inset-x-0 bottom-0 bg-card pb-(--safe-footer-inset)">
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
