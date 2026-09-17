<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { updatePassword } from '@/api/session';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import ManageTwoFactor from '@/components/ManageTwoFactor.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { sessionState } from '@/state/session';

const currentPassword = ref('');
const password = ref('');
const passwordConfirmation = ref('');
const processing = ref(false);
const errors = ref<Record<string, string>>({});
const message = ref<string | null>(null);

const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
    message.value = null;
    try {
        const session = await updatePassword(
            password.value,
            passwordConfirmation.value,
            currentPassword.value,
        );
        sessionState.replace(session);
        currentPassword.value = '';
        password.value = '';
        passwordConfirmation.value = '';
        message.value = 'Contraseña actualizada.';
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]),
            );
            if (Object.keys(errors.value).length === 0) errors.value.request = reason.message;
        } else {
            errors.value.request = 'No se pudo actualizar la contraseña.';
        }
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <SettingsLayout>
        <div class="space-y-6">
            <Heading variant="small" title="Actualizar contraseña" description="Use una contraseña larga y única para proteger su cuenta" />
            <p v-if="message" class="text-sm text-foreground" role="status">{{ message }}</p>
            <InputError :message="errors.request" />

            <form class="space-y-6" @submit.prevent="submit">
                <div class="grid gap-2">
                    <Label for="current_password" required>Contraseña actual</Label>
                    <PasswordInput id="current_password" v-model="currentPassword" required autocomplete="current-password" placeholder="Contraseña actual" />
                    <InputError :message="errors.current_password" />
                </div>
                <div class="grid gap-2">
                    <Label for="password" required>Contraseña nueva</Label>
                    <PasswordInput id="password" v-model="password" required autocomplete="new-password" placeholder="Contraseña nueva" />
                    <InputError :message="errors.password" />
                </div>
                <div class="grid gap-2">
                    <Label for="password_confirmation" required>Confirmar contraseña</Label>
                    <PasswordInput id="password_confirmation" v-model="passwordConfirmation" required autocomplete="new-password" placeholder="Confirmar contraseña" />
                    <InputError :message="errors.password_confirmation" />
                </div>
                <div class="flex items-center gap-4">
                    <Button :disabled="processing" data-test="update-password-button">
                        <Spinner v-if="processing" />Guardar
                    </Button>
                </div>
            </form>
        </div>

        <ManageTwoFactor />
    </SettingsLayout>
</template>
