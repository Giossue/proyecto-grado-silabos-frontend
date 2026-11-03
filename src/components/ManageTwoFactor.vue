<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { ShieldCheck, ShieldOff } from '@lucide/vue';
import { onMounted, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import {
    confirmTwoFactor,
    disableTwoFactor,
    enableTwoFactor,
    getTwoFactorStatus,
    regenerateRecoveryCodes,
} from '@/api/session';
import InputError from '@/components/InputError.vue';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import TwoFactorRecoveryCodes from '@/components/TwoFactorRecoveryCodes.vue';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

const emit = defineEmits<{ loading: [loading: boolean] }>();

const enabled = ref<boolean | null>(null);
const loading = ref(true);
const confirmationRequired = ref(false);
const qrCodeSvg = ref<string | null>(null);
const recoveryCodes = ref<string[]>([]);
const showSetupModal = ref(false);
const processing = ref(false);
const error = ref<string | null>(null);

const messageOf = (reason: unknown, fallback: string): string =>
    reason instanceof ApiError ? reason.message : fallback;

const load = async (): Promise<void> => {
    loading.value = true;
    emit('loading', true);
    try {
        const status = await getTwoFactorStatus();
        enabled.value = status.enabled;
        confirmationRequired.value = status.confirmation_required;
    } catch (reason) {
        error.value = messageOf(reason, 'No se pudo consultar el segundo factor');
    } finally {
        loading.value = false;
        emit('loading', false);
    }
};

const enable = async (password: string): Promise<void> => {
    processing.value = true;
    error.value = null;
    try {
        const status = await enableTwoFactor(password);
        confirmationRequired.value = status.confirmation_required;
        qrCodeSvg.value = status.qr_code_svg;
        showSetupModal.value = true;
    } catch (reason) {
        error.value = messageOf(reason, 'No se pudo iniciar la configuración');
    } finally {
        processing.value = false;
    }
};

const confirm = async (code: string): Promise<void> => {
    processing.value = true;
    error.value = null;
    try {
        const status = await confirmTwoFactor(code);
        enabled.value = status.enabled;
        confirmationRequired.value = status.confirmation_required;
        recoveryCodes.value = status.recovery_codes;
        showSetupModal.value = false;
    } catch (reason) {
        error.value = messageOf(reason, 'El código no es válido');
    } finally {
        processing.value = false;
    }
};

// Desactivar pide la contraseña y un segundo factor: el código del autenticador o uno de recuperación.
const disableOpen = ref(false);
const disablePassword = ref('');
const disableCode = ref('');
const useRecoveryCode = ref(false);
const disableErrors = ref<Record<string, string[]>>({});
const disableError = ref<string | null>(null);
watch(disableOpen, (value) => {
    if (!value) return;
    disablePassword.value = '';
    disableCode.value = '';
    useRecoveryCode.value = false;
    disableErrors.value = {};
    disableError.value = null;
});
const toggleRecoveryCode = (): void => {
    useRecoveryCode.value = !useRecoveryCode.value;
    disableCode.value = '';
};

const disable = async (): Promise<void> => {
    if (!disablePassword.value || !disableCode.value) return;
    processing.value = true;
    error.value = null;
    disableErrors.value = {};
    disableError.value = null;
    try {
        const status = useRecoveryCode.value
            ? await disableTwoFactor(disablePassword.value, '', disableCode.value)
            : await disableTwoFactor(disablePassword.value, disableCode.value);
        enabled.value = status.enabled;
        confirmationRequired.value = status.confirmation_required;
        recoveryCodes.value = [];
        disableOpen.value = false;
    } catch (reason) {
        disableErrors.value = reason instanceof ApiError ? reason.errors : {};
        disableError.value = messageOf(reason, 'No se pudo desactivar el segundo factor');
    } finally {
        processing.value = false;
    }
};

const regenerate = async (password: string): Promise<void> => {
    processing.value = true;
    error.value = null;
    try {
        recoveryCodes.value = (await regenerateRecoveryCodes(password)).recovery_codes;
    } catch (reason) {
        error.value = messageOf(reason, 'No se pudieron regenerar los códigos');
    } finally {
        processing.value = false;
    }
};

const pendingEnable = ref(false);
const confirmEnable = async (password: string): Promise<void> => {
    pendingEnable.value = false;
    await enable(password);
};

onMounted(() => void load());
</script>

<template>
    <div data-tour="security-2fa" class="flex flex-col gap-6">
        <FeedbackAlert v-if="error" :message="error" />

        <div v-if="loading" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando autenticación de dos factores">
            <span class="sr-only">Cargando autenticación de dos factores…</span>
            <div aria-hidden="true" class="flex flex-col items-start gap-4"><div class="flex w-full flex-col gap-1"><Skeleton class="h-4 w-full" /><Skeleton class="h-4 w-2/3" /></div><Skeleton class="h-9 w-31 max-w-full" /></div>
        </div>

        <div v-else-if="enabled === false" class="flex flex-col items-start justify-start gap-4">
            <p class="text-sm text-muted-foreground">
                Al activarla, el inicio de sesión solicitará un código seguro generado por una aplicación TOTP en su dispositivo
            </p>
            <Button type="button" :disabled="processing" @click="pendingEnable = true">
                <Spinner v-if="processing" data-icon="inline-start" />
                <ShieldCheck v-else data-icon="inline-start" aria-hidden="true" />
                Activar 2FA
            </Button>
        </div>

        <div v-else-if="enabled" class="flex flex-col items-start justify-start gap-4">
            <p class="text-sm text-muted-foreground">
                El inicio de sesión solicitará un código temporal generado por la aplicación TOTP de su dispositivo
            </p>
            <Button variant="destructive" type="button" :disabled="processing" @click="disableOpen = true">
                <Spinner v-if="processing" data-icon="inline-start" /><ShieldOff v-else data-icon="inline-start" aria-hidden="true" />Desactivar 2FA
            </Button>
            <TwoFactorRecoveryCodes :codes="recoveryCodes" :processing="processing" @regenerate="regenerate" />
        </div>

        <PasswordConfirmDialog
            v-model:open="pendingEnable"
            title="Activar la verificación en dos pasos"
            description="Por seguridad, confirme su contraseña actual para continuar"
            confirm-label="Continuar"
            @confirm="confirmEnable"
        />
        <Dialog v-model:open="disableOpen">
            <DialogContent>
                <form class="flex flex-col gap-4" @submit.prevent="disable">
                    <DialogHeader>
                        <DialogTitle>Desactivar la verificación en dos pasos</DialogTitle>
                        <DialogDescription>Por seguridad, confirme su contraseña actual y un código de su aplicación de autenticación</DialogDescription>
                    </DialogHeader>
                    <div class="grid gap-2">
                        <Label for="disable-current-password" required>Contraseña actual</Label>
                        <PasswordInput id="disable-current-password" v-model="disablePassword" autocomplete="current-password" aria-required="true" />
                        <InputError :message="disableErrors.current_password?.[0]" />
                    </div>
                    <div class="grid gap-2">
                        <Label for="disable-code" required>{{ useRecoveryCode ? 'Código de recuperación' : 'Código de autenticación' }}</Label>
                        <Input
                            id="disable-code"
                            v-model="disableCode"
                            type="text"
                            autocomplete="one-time-code"
                            :inputmode="useRecoveryCode ? 'text' : 'numeric'"
                            :maxlength="useRecoveryCode ? 128 : 6"
                            :placeholder="useRecoveryCode ? 'Ej. ABCD-EFGH' : 'Código de 6 dígitos'"
                            aria-required="true"
                        />
                        <InputError :message="disableErrors.code?.[0] ?? disableErrors.recovery_code?.[0]" />
                        <Button type="button" variant="link" class="h-auto justify-start p-0 text-sm" @click="toggleRecoveryCode">
                            {{ useRecoveryCode ? 'Usar un código de autenticación' : 'Usar un código de recuperación' }}
                        </Button>
                    </div>
                    <FeedbackAlert v-if="disableError && Object.keys(disableErrors).length === 0" :message="disableError" />
                    <DialogFooter>
                        <Button type="button" variant="outline" @click="disableOpen = false">Cancelar</Button>
                        <Button type="submit" variant="destructive" :disabled="processing || !disablePassword || !disableCode">
                            <Spinner v-if="processing" data-icon="inline-start" /><ShieldOff v-else data-icon="inline-start" aria-hidden="true" />Desactivar 2FA
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        <TwoFactorSetupModal
            v-model:is-open="showSetupModal"
            :qr-code-svg="qrCodeSvg"
            :processing="processing"
            :error="error"
            @confirm="confirm"
        />
    </div>
</template>
