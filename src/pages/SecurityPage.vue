<script setup lang="ts">
import { Mail, Save } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { requestPasswordRecovery, updatePassword } from '@/api/session';
import Heading from '@/components/Heading.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import InputError from '@/components/InputError.vue';
import LoadingSkeleton from '@/components/domain/LoadingSkeleton.vue';
import ManageTwoFactor from '@/components/ManageTwoFactor.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import SettingsLayout from '@/layouts/settings/Layout.vue';
import { toast } from '@/lib/toast';
import { sessionState } from '@/state/session';

const currentPassword = ref('');
const loading = ref(true);
const password = ref('');
const passwordConfirmation = ref('');
const processing = ref(false);
const errors = ref<Record<string, string>>({});

const recoveryOpen = ref(false);
const recoveryError = ref<string | null>(null);
const recoveryProcessing = ref(false);
const sendRecoveryLink = async (): Promise<void> => {
    const email = sessionState.current.value?.user.email;
    if (!email) return;
    recoveryProcessing.value = true;
    recoveryError.value = null;
    try {
        await requestPasswordRecovery(email);
        recoveryOpen.value = false;
        toast.success('Enlace enviado. Revise su correo');
    } catch (reason) {
        recoveryError.value = reason instanceof ApiError && reason.status === 429
            ? 'Se alcanzó el máximo de envíos. Intente de nuevo más tarde'
            : reason instanceof ApiError ? reason.message : 'No se pudo enviar el enlace';
    } finally {
        recoveryProcessing.value = false;
    }
};

const submit = async (): Promise<void> => {
    processing.value = true;
    errors.value = {};
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
        toast.success('Contraseña actualizada');
    } catch (reason) {
        if (reason instanceof ApiError) {
            errors.value = Object.fromEntries(
                Object.entries(reason.errors).map(([key, values]) => [key, values[0] ?? reason.message]),
            );
            if (Object.keys(errors.value).length === 0) errors.value.request = reason.message;
        } else {
            errors.value.request = 'No se pudo actualizar la contraseña';
        }
    } finally {
        processing.value = false;
    }
};
</script>

<template>
    <SettingsLayout>
        <LoadingSkeleton v-if="loading" variant="settings" settings-section="security" />
        <div v-show="!loading" class="contents">
            <div class="flex flex-col gap-6">
                <Heading variant="small" title="Actualizar contraseña" description="Use una contraseña larga y única para proteger su cuenta" />
                <InputError :message="errors.request" />

                <form class="flex flex-col gap-6" @submit.prevent="submit">
                    <div class="grid gap-2">
                        <Label for="current_password" required>Contraseña actual</Label>
                        <PasswordInput id="current_password" v-model="currentPassword" aria-required="true" class="mt-1 block w-full" autocomplete="current-password" placeholder="Contraseña actual" />
                        <InputError :message="errors.current_password" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="password" required>Contraseña nueva</Label>
                        <PasswordInput id="password" v-model="password" aria-required="true" class="mt-1 block w-full" autocomplete="new-password" placeholder="Contraseña nueva" />
                        <InputError :message="errors.password" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="password_confirmation" required>Confirmar contraseña</Label>
                        <PasswordInput id="password_confirmation" v-model="passwordConfirmation" aria-required="true" class="mt-1 block w-full" autocomplete="new-password" placeholder="Confirmar contraseña" />
                        <InputError :message="errors.password_confirmation" />
                    </div>
                    <div class="flex items-center gap-4">
                        <Button :disabled="processing" data-test="update-password-button">
                            <Spinner v-if="processing" data-icon="inline-start" />
                            <Save v-else data-icon="inline-start" aria-hidden="true" />
                            Guardar
                        </Button>
                    </div>
                </form>
            </div>

            <div class="flex flex-col gap-4">
                <Heading variant="small" title="Restablecer por correo" :description="`Le enviaremos un enlace a ${sessionState.current.value?.user.email ?? 'su correo'}. Al cambiar la contraseña con él, se cerrará la sesión en todos los dispositivos`" />
                <div>
                    <Button type="button" @click="recoveryError = null; recoveryOpen = true">
                        <Mail data-icon="inline-start" aria-hidden="true" />
                        Enviar enlace
                    </Button>
                </div>
            </div>

            <ManageTwoFactor @loading="loading = $event" />
        </div>
        <Dialog v-model:open="recoveryOpen">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Enviar enlace para restablecer la contraseña</DialogTitle>
                    <DialogDescription>Se enviará a {{ sessionState.current.value?.user.email }}. Al cambiar la contraseña con él, se cerrará la sesión en todos los dispositivos</DialogDescription>
                </DialogHeader>
                <FeedbackAlert v-if="recoveryError" :message="recoveryError" />
                <DialogFooter>
                    <DialogClose as-child><Button type="button" variant="outline" :disabled="recoveryProcessing">Cancelar</Button></DialogClose>
                    <Button type="button" :disabled="recoveryProcessing" @click="sendRecoveryLink">
                        <Spinner v-if="recoveryProcessing" data-icon="inline-start" />
                        <Mail v-else data-icon="inline-start" aria-hidden="true" />
                        Enviar enlace
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </SettingsLayout>
</template>
