<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { logout, resendEmailVerification, verifyEmail } from '@/api/session';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import { sessionState } from '@/state/session';
import { clearIntendedRoute } from '@/lib/intended-route';

const route = useRoute();
const router = useRouter();
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const processing = ref(false);
const userId = computed(() => typeof route.params.user === 'string' ? route.params.user : '');
const hash = computed(() => typeof route.params.hash === 'string' ? route.params.hash : '');
const verifiesSignedLink = computed(() => userId.value !== '' && hash.value !== '');

const verifySignedLink = async (): Promise<void> => {
    processing.value = true;
    try {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(route.query)) {
            if (typeof value === 'string') query.set(key, value);
        }
        message.value = (await verifyEmail(userId.value, hash.value, query)).message;
    } catch (reason) {
        error.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo verificar el correo.';
    } finally {
        processing.value = false;
    }
};

const resend = async (): Promise<void> => {
    processing.value = true;
    message.value = null;
    error.value = null;
    try {
        await resendEmailVerification();
        message.value = 'Se envió un nuevo enlace de verificación al correo registrado.';
    } catch (reason) {
        error.value = reason instanceof ApiError
            ? reason.message
            : 'No se pudo reenviar el correo de verificación.';
    } finally {
        processing.value = false;
    }
};

const closeSession = async (): Promise<void> => {
    await logout();
    sessionState.clear();
    clearIntendedRoute();
    await router.replace('/login');
};

onMounted(() => {
    if (verifiesSignedLink.value) void verifySignedLink();
});
</script>

<template>
    <AuthSimpleLayout
        title="Verificación de correo"
        :description="verifiesSignedLink
            ? 'Confirmamos la dirección institucional asociada a su cuenta.'
            : 'Verifique su correo mediante el enlace que acabamos de enviarle.'"
    >
        <template v-if="verifiesSignedLink">
            <div class="flex flex-col gap-5 text-center">
                <p v-if="message" class="text-sm" role="status">{{ message }}</p>
                <p v-else-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
                <p v-else class="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Spinner />
                    Verificando correo…
                </p>
                <Button as-child><RouterLink to="/login">Iniciar sesión</RouterLink></Button>
            </div>
        </template>

        <template v-else>
            <div v-if="message" class="mb-4 text-center text-sm font-medium text-green-600" role="status">
                {{ message }}
            </div>
            <p v-if="error" class="mb-4 text-center text-sm text-destructive" role="alert">
                {{ error }}
            </p>

            <div class="space-y-6 text-center">
                <Button type="button" :disabled="processing" variant="secondary" @click="resend">
                    <Spinner v-if="processing" />
                    Reenviar correo de verificación
                </Button>

                <TextLink as="button" class="mx-auto block text-sm" @click="closeSession">
                    Cerrar sesión
                </TextLink>
            </div>
        </template>
    </AuthSimpleLayout>
</template>
