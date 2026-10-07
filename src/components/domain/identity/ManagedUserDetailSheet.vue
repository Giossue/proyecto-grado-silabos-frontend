<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
import { Eye } from '@lucide/vue';
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetDescription,
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
    user: ManagedUserRow;
}>();

const open = defineModel<boolean>('open', { default: false });

const status = computed(() => {
    if (!props.user.active) {
        return {
            label: 'Inactivo',
            variant: 'outline' as const,
            hint: 'La cuenta está desactivada y no puede iniciar sesión.',
        };
    }

    if (props.user.pending_activation) {
        return {
            label: 'Pendiente de activación',
            variant: 'default' as const,
            hint: 'La cuenta espera que su titular abra la invitación y defina su contraseña.',
        };
    }

    return {
        label: 'Activo',
        variant: 'secondary' as const,
        hint: 'La cuenta está en uso y su titular ya definió su contraseña.',
    };
});

const scopeOf = (assignment: ManagedUserRoleAssignment): string =>
    assignment.career_name ?? 'Todas las carreras';

const currentAssignments = computed(() =>
    props.user.assignments.filter((assignment) => assignment.active),
);
const completedAssignments = computed(() =>
    props.user.assignments.filter((assignment) => !assignment.active),
);
</script>

<template>
    <Sheet v-model:open="open">
        <SheetContent side="right" class="w-full sm:max-w-lg">
            <SheetHeader class="sr-only">
                <SheetTitle>Datos</SheetTitle>
                <SheetDescription>Ficha de solo lectura de la cuenta.</SheetDescription>
            </SheetHeader>

            <div class="flex flex-col gap-4 overflow-y-auto px-4 pt-1 pb-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la cuenta</CardTitle>
                        <CardDescription>{{ withoutEndPeriod(status.hint) }}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <dl class="grid gap-3 text-sm">
                            <div class="flex flex-col gap-1">
                                <dt class="text-muted-foreground">Estado</dt>
                                <dd>
                                    <Badge :variant="status.variant">
                                        {{ status.label }}
                                    </Badge>
                                </dd>
                            </div>
                            <div class="flex flex-col gap-1">
                                <dt class="text-muted-foreground">
                                    Nombre completo
                                </dt>
                                <dd class="font-medium">
                                    {{ props.user.nombre }}
                                </dd>
                            </div>
                            <div class="flex flex-col gap-1">
                                <dt class="text-muted-foreground">
                                    Correo institucional
                                </dt>
                                <dd class="font-medium">
                                    {{ props.user.correo_electronico }}
                                </dd>
                            </div>
                            <div class="flex flex-col gap-1">
                                <dt class="text-muted-foreground">
                                    Acceso en dos pasos
                                </dt>
                                <dd class="font-medium">
                                    {{
                                        props.user.two_factor_enabled
                                            ? 'Configurado por su titular'
                                            : 'Sin configurar'
                                    }}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Roles vigentes</CardTitle>
                        <CardDescription>
                            Cada rol dice qué puede hacer y sobre qué carrera.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p
                            v-if="currentAssignments.length === 0"
                            class="text-sm text-muted-foreground"
                        >
                            Sin rol vigente: la cuenta no accede a ningún
                            módulo.
                        </p>
                        <ul v-else class="flex flex-col gap-3 text-sm">
                            <li
                                v-for="assignment in currentAssignments"
                                :key="assignment.id"
                                class="flex flex-col gap-1"
                            >
                                <span class="font-medium">
                                    {{ assignment.role_name }}
                                </span>
                                <span class="text-muted-foreground">
                                    {{ scopeOf(assignment) }}
                                </span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card v-if="completedAssignments.length > 0">
                    <CardHeader>
                        <CardTitle>Roles finalizados</CardTitle>
                        <CardDescription>
                            Asignaciones retiradas que se conservan como
                            historial.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul class="flex flex-col gap-3 text-sm">
                            <li
                                v-for="assignment in completedAssignments"
                                :key="assignment.id"
                                class="flex flex-col gap-1"
                            >
                                <span class="font-medium">
                                    {{ assignment.role_name }}
                                </span>
                                <span class="text-muted-foreground">
                                    {{ scopeOf(assignment) }}
                                </span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </SheetContent>
    </Sheet>

    <DropdownMenuItem
        @select="
            (event: Event) => {
                event.preventDefault();
                open = true;
            }
        "
    >
        <Eye aria-hidden="true" />
        Ver
    </DropdownMenuItem>
</template>
