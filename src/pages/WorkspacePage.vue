<script setup lang="ts">
import { ArrowRight, CheckCircle2 } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSession, selectActiveRole, type ActiveRole, type Session } from '@/api/session';
import PageFrame from '@/components/domain/PageFrame.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { sessionState } from '@/state/session';
import { consumeIntendedRoute } from '@/lib/intended-route';

const router = useRouter();
const session = ref<Session | null>(null);
const error = ref<string | null>(null);
const selectingRoleId = ref<string | null>(null);

const hasCoordinatorScope = computed(() =>
    session.value?.available_roles.some((role) => role.code === 'coordinador') === true,
);
const selectionDescription = computed(() =>
    hasCoordinatorScope.value
        ? 'Seleccione la carrera y el ámbito con el que trabajará en esta sesión.'
        : 'Seleccione el ámbito con el que trabajará en esta sesión.',
);

const actionLabel = (role: ActiveRole): string => {
    if (session.value?.active_role?.id === role.id) return 'Continuar aquí';
    return role.code === 'coordinador'
        ? 'Entrar a esta carrera'
        : `Entrar como ${role.code}`;
};

const load = async (): Promise<void> => {
    try {
        session.value = await getSession();
        sessionState.replace(session.value);
        if (!session.value.user.email_verified) {
            await router.replace('/verificar-correo');
            return;
        }
        if (session.value.active_role && !session.value.user.must_change_password) {
            await router.replace(consumeIntendedRoute() ?? '/dashboard');
        }
    } catch (reason) {
        if (reason instanceof ApiError && reason.status === 401) {
            await router.replace('/login');
            return;
        }
        error.value = 'No se pudo cargar su sesión.';
    }
};

const selectRole = async (roleAssignmentId: string): Promise<void> => {
    error.value = null;
    selectingRoleId.value = roleAssignmentId;
    try {
        session.value = await selectActiveRole(roleAssignmentId);
        sessionState.replace(session.value);
        await router.replace(consumeIntendedRoute() ?? '/dashboard');
    } catch (reason) {
        error.value = reason instanceof ApiError
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
        <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>

        <Alert v-if="session.available_roles.length === 0">
            <AlertTitle>No tiene asignaciones vigentes</AlertTitle>
            <AlertDescription>
                Contáctese con el coordinador de la carrera.
            </AlertDescription>
        </Alert>

        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card v-for="role in session.available_roles" :key="role.id" class="h-full">
                <CardHeader>
                    <CardTitle>{{ role.career_name ?? role.code }}</CardTitle>
                    <CardAction>
                        <Badge v-if="session.active_role?.id === role.id" variant="secondary">
                            <CheckCircle2 aria-hidden="true" />
                            Activo
                        </Badge>
                        <Badge v-else variant="outline">{{ role.code }}</Badge>
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
    <LoadingSkeleton v-else-if="!error" variant="detail" />
    <p v-else class="p-6 text-sm text-destructive" role="alert">{{ error }}</p>
</template>
