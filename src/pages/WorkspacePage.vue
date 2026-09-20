<script setup lang="ts">
import { ArrowRight, CheckCircle2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSession, selectActiveRole, type ActiveRole, type Session } from '@/api/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import LoadErrorState from '@/components/domain/LoadErrorState.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { sessionState } from '@/state/session';
import { consumeIntendedRoute } from '@/lib/intended-route';
import { paths, roleEntry } from '@/lib/routes';

const router = useRouter();
const session = ref<Session | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const selectingRoleId = ref<string | null>(null);

const hasCoordinatorScope = computed(() =>
    session.value?.available_roles.some((role) => role.code === 'coordinador') === true,
);
const teacherOnly = computed(() => {
    const roles = session.value?.available_roles ?? [];
    return roles.length > 0 && roles.every((role) => role.code === 'docente');
});
const selectionDescription = computed(() =>
    hasCoordinatorScope.value
        ? 'Seleccione la carrera y el ámbito con el que trabajará en esta sesión.'
        : teacherOnly.value
            ? 'Seleccione la carrera para ver sus sílabos asignados.'
            : 'Seleccione el ámbito con el que trabajará en esta sesión.',
);

const roleLabel = (role: ActiveRole): string => ({
    administrador: 'Administrador',
    coordinador: 'Coordinador',
    docente: 'Docente',
}[role.code]);

const roleTitle = (role: ActiveRole): string =>
    role.code === 'docente' && role.career_name
        ? `Docencia · ${role.career_name}`
        : role.career_name ?? roleLabel(role);

const roleDescription = (role: ActiveRole): string => {
    if (role.code === 'docente') return 'Sílabos asignados en esta carrera.';
    if (role.code === 'coordinador') return `Coordinación de ${role.career_name ?? 'la carrera asignada'}.`;
    return 'Administración general del sistema.';
};

const actionLabel = (role: ActiveRole): string => {
    if (session.value?.active_role?.id === role.id) return 'Continuar aquí';
    if (role.code === 'coordinador') return 'Entrar a esta carrera';
    if (role.code === 'docente') return 'Ver mis sílabos';
    return 'Entrar como Administrador';
};

const load = async (): Promise<void> => {
    loading.value = true;
    loadError.value = null;
    try {
        session.value = await getSession();
        sessionState.replace(session.value);
        if (!session.value.user.email_verified) {
            await router.replace(paths.emailVerificationRequired);
            return;
        }
        if (session.value.active_role) {
            await router.replace(consumeIntendedRoute() ?? roleEntry(session.value.active_role.code));
            return;
        }
        const soleTeacherRole = session.value.available_roles.length === 1
            && session.value.available_roles[0]?.code === 'docente';
        if (soleTeacherRole) {
            await selectRole(session.value.available_roles[0]!.id);
        }
    } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
            await router.replace(paths.login);
            return;
        }
        loadError.value = 'No se pudo cargar su sesión.';
    } finally {
        loading.value = false;
    }
};

const selectRole = async (roleAssignmentId: string): Promise<void> => {
    actionError.value = null;
    selectingRoleId.value = roleAssignmentId;
    try {
        session.value = await selectActiveRole(roleAssignmentId);
        sessionState.replace(session.value);
        await router.replace(consumeIntendedRoute() ?? roleEntry(session.value.active_role?.code));
    } catch (reason) {
        actionError.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo seleccionar el ámbito de trabajo.';
    } finally {
        selectingRoleId.value = null;
    }
};

onMounted(load);
</script>

<template>
    <PageFrame
        v-if="session"
        :title="`Bienvenida, ${session.user.name}`"
        :description="selectionDescription"
        size="wide"
    >
        <p v-if="actionError" class="text-sm text-destructive" role="alert">{{ actionError }}</p>

        <Alert v-if="session.available_roles.length === 0">
            <AlertTitle>No tiene asignaciones vigentes</AlertTitle>
            <AlertDescription>
                Contáctese con el coordinador de la carrera.
            </AlertDescription>
        </Alert>

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card v-for="role in session.available_roles" :key="role.id" class="h-full">
                <CardHeader>
                    <CardTitle>{{ roleTitle(role) }}</CardTitle>
                    <CardDescription>{{ roleDescription(role) }}</CardDescription>
                    <CardAction>
                        <Badge v-if="session.active_role?.id === role.id" variant="secondary">
                            <CheckCircle2 aria-hidden="true" />
                            Activo
                        </Badge>
                        <Badge v-else variant="outline">{{ roleLabel(role) }}</Badge>
                    </CardAction>
                </CardHeader>
                <CardFooter class="mt-auto">
                    <Button
                        class="w-full"
                        type="button"
                        :disabled="selectingRoleId !== null"
                        @click="selectRole(role.id)"
                    >
                        <Spinner v-if="selectingRoleId === role.id" data-icon="inline-start" />
                        <ArrowRight v-else data-icon="inline-start" aria-hidden="true" />
                        {{ actionLabel(role) }}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    </PageFrame>
    <LoadErrorState v-else-if="loadError" :message="loadError" @retry="load" />
    <LoadingSkeleton v-else-if="loading" variant="workspace" />
</template>
