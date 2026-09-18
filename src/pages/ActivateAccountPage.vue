<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { activateAccount } from '@/api/session';
import { ApiError } from '@/api/client';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';

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
        <form class="space-y-6" @submit.prevent="submit">
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
            <p v-if="error && Object.keys(errors).length === 0" class="text-sm text-destructive" role="alert">{{ error }}</p>
            <InputError :message="errors.token?.[0]" />
            <Button type="submit" class="w-full" :disabled="pending || !token">
                <Spinner v-if="pending" />
                Activar cuenta
            </Button>
        </form>
    </AuthSimpleLayout>
</template>
