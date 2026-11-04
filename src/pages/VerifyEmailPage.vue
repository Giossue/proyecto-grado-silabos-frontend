<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { logout, resendActivation } from '@/api/session';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthSimpleLayout from '@/layouts/auth/AuthSplitLayout.vue';
import { sessionState } from '@/state/session';
import { clearIntendedRoute } from '@/lib/intended-route';
import { paths } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const error = ref<string | null>(null);
const processing = ref(false);

const resend = async (): Promise<void> => {
    processing.value = true;
    error.value = null;
    try {
        toast.success((await resendActivation()).message);
    } catch (reason) {
        error.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo reenviar el enlace de activación';
    } finally {
        processing.value = false;
    }
};

const closeSession = async (): Promise<void> => {
    await logout();
    sessionState.clear();
    clearIntendedRoute();
    await router.replace(paths.login);
};
</script>

<template>
    <AuthSimpleLayout
        title="Cuenta sin activar"
        description="Active su cuenta con el enlace que le enviamos a su correo"
    >
        <FeedbackAlert v-if="error" :message="error" />

        <div class="flex flex-col gap-6 text-center">
            <Button type="button" :disabled="processing" variant="secondary" @click="resend">
                <Spinner v-if="processing" />
                Reenviar enlace de activación
            </Button>

            <TextLink as="button" class="mx-auto block text-sm" @click="closeSession">
                Cerrar sesión
            </TextLink>
        </div>
    </AuthSimpleLayout>
</template>
