<script setup lang="ts">
import { UserCheck } from '@lucide/vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { activateAccount, logout } from '@/api/session';
import { ApiError } from '@/api/client';
import AuthSimpleLayout from '@/layouts/auth/AuthSplitLayout.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';
import { clearIntendedRoute } from '@/lib/intended-route';
import { sessionState } from '@/state/session';

const route = useRoute();
const router = useRouter();
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '');
const password = ref('');
const passwordConfirmation = ref('');
const error = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const pending = ref(false);

const submit = async (): Promise<void> => {
    if (!token.value) {
        error.value = 'El enlace de activación está incompleto.';
        return;
    }
    pending.value = true;
    error.value = null;
    errors.value = {};
    try {
        const result = await activateAccount(token.value, password.value, passwordConfirmation.value);
        if (sessionState.current.value) {
            await logout().catch(() => undefined);
            sessionState.clear();
        }
        clearIntendedRoute();
        await router.replace({ path: paths.login, query: { status: result.message } });
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = reason.errors;
            error.value = reason.message;
        } else {
            error.value = 'No se pudo activar la cuenta.';
        }
    } finally {
        pending.value = false;
    }
};
</script>

<template>
    <AuthSimpleLayout title="Activar cuenta" description="Verifique su correo y defina una contraseña para ingresar al sistema.">
        <form class="flex flex-col gap-6" @submit.prevent="submit">
            <div class="grid gap-2">
                <Label for="activation-password" required>Contraseña</Label>
                <PasswordInput id="activation-password" v-model="password" autocomplete="new-password" required :aria-invalid="Boolean(errors.password)" />
                <InputError :message="errors.password?.[0]" />
            </div>
            <div class="grid gap-2">
                <Label for="activation-password-confirmation" required>Confirmar contraseña</Label>
                <PasswordInput id="activation-password-confirmation" v-model="passwordConfirmation" autocomplete="new-password" required :aria-invalid="Boolean(errors.password_confirmation)" />
                <InputError :message="errors.password_confirmation?.[0]" />
            </div>
            <FeedbackAlert v-if="error && Object.keys(errors).length === 0" :message="error" />
            <InputError :message="errors.token?.[0]" />
            <Button type="submit" class="w-full" :disabled="pending || !token">
                <Spinner v-if="pending" data-icon="inline-start" />
                <UserCheck v-else data-icon="inline-start" aria-hidden="true" />
                Activar cuenta
            </Button>
        </form>
    </AuthSimpleLayout>
</template>
