<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { ArrowRight, CheckCircle2 } from '@lucide/vue';
import { onMounted, ref } from 'vue';
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
import { roleLabel, scopeTitle } from '@/lib/roles';

const router = useRouter();
const session = ref<Session | null>(null);
const loading = ref(true);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const selectingRoleId = ref<string | null>(null);

const selectionDescription = 'Seleccione la carrera con la que trabajará en esta sesión';

const roleDescription = (role: ActiveRole): string => {
    if (role.code === 'docente') return role.career_name ? 'Docencia' : 'Docencia en la carrera asignada';
    if (role.code === 'coordinador') return role.career_name ? 'Coordinación' : 'Coordinación de la carrera asignada';
    if (role.code === 'bibliotecario') return 'Verificación de la bibliografía de los sílabos de todas las carreras';
    if (role.code === 'administrador') return 'Administración general del sistema';
    return role.career_name ? `${roleLabel(role.code)} · ${role.career_name}` : roleLabel(role.code);
};

const actionLabel = (role: ActiveRole): string => {
    if (session.value?.active_role?.id === role.id) return 'Continuar aquí';
    if (role.code === 'coordinador' || role.code === 'docente') return 'Entrar a esta carrera';
    if (role.code === 'bibliotecario') return 'Entrar a Biblioteca';
    if (role.code === 'administrador') return 'Entrar como Administrador';
    return `Entrar como ${roleLabel(role.code)}`;
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
        }
    } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
            await router.replace(paths.login);
            return;
        }
        loadError.value = 'No se pudo cargar su sesión';
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
            : 'No se pudo seleccionar el ámbito de trabajo';
    } finally {
        selectingRoleId.value = null;
    }
};

onMounted(load);
</script>

<template>
    <PageFrame
        v-if="session"
        :title="`Hola, ${session.user.name}`"
        :description="selectionDescription"
        size="wide"
    >
        <FeedbackAlert v-if="actionError" :message="actionError" />

        <Alert v-if="session.available_roles.length === 0">
            <AlertTitle>No tiene asignaciones vigentes</AlertTitle>
            <AlertDescription>
                Contáctese con el coordinador de la carrera
            </AlertDescription>
        </Alert>

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card v-for="role in session.available_roles" :key="role.id" class="h-full">
                <CardHeader>
                    <CardTitle>{{ role.code === 'docente' ? (role.career_name ?? scopeTitle(role)) : scopeTitle(role) }}</CardTitle>
                    <CardDescription v-if="roleDescription(role)">{{ roleDescription(role) }}</CardDescription>
                    <CardAction v-if="session.active_role?.id === role.id">
                        <Badge variant="secondary">
                            <CheckCircle2 aria-hidden="true" />
                            Activo
                        </Badge>
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
    <LoadingSkeleton v-else-if="loading" variant="workspace" :workspace-count="sessionState.current.value?.available_roles.length ?? 3" />
</template>
