<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { ShieldCheck, ShieldOff } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import {
    confirmTwoFactor,
    disableTwoFactor,
    enableTwoFactor,
    getTwoFactorStatus,
    regenerateRecoveryCodes,
} from '@/api/session';
import Heading from '@/components/Heading.vue';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog.vue';
import TwoFactorRecoveryCodes from '@/components/TwoFactorRecoveryCodes.vue';
import TwoFactorSetupModal from '@/components/TwoFactorSetupModal.vue';
import { Button } from '@/components/ui/button';
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

const disable = async (password: string): Promise<void> => {
    processing.value = true;
    error.value = null;
    try {
        const status = await disableTwoFactor(password);
        enabled.value = status.enabled;
        confirmationRequired.value = status.confirmation_required;
        recoveryCodes.value = [];
    } catch (reason) {
        error.value = messageOf(reason, 'No se pudo desactivar el segundo factor');
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

const pendingAction = ref<'enable' | 'disable' | null>(null);
const confirmOpen = computed({
    get: () => pendingAction.value !== null,
    set: (value: boolean) => { if (!value) pendingAction.value = null; },
});
const confirmPassword = async (password: string): Promise<void> => {
    const action = pendingAction.value;
    pendingAction.value = null;
    if (action === 'enable') await enable(password);
    if (action === 'disable') await disable(password);
};

onMounted(() => void load());
</script>

<template>
    <div class="flex flex-col gap-6">
        <Heading variant="small" title="Autenticación de dos factores" description="Administre la protección adicional de su cuenta" />
        <FeedbackAlert v-if="error" :message="error" />

        <div v-if="loading" role="status" aria-live="polite" aria-busy="true" aria-label="Cargando autenticación de dos factores">
            <span class="sr-only">Cargando autenticación de dos factores…</span>
            <div aria-hidden="true" class="flex flex-col items-start gap-4"><div class="flex w-full flex-col gap-1"><Skeleton class="h-4 w-full" /><Skeleton class="h-4 w-2/3" /></div><Skeleton class="h-9 w-31 max-w-full" /></div>
        </div>

        <div v-else-if="enabled === false" class="flex flex-col items-start justify-start gap-4">
            <p class="text-sm text-muted-foreground">
                Al activarla, el inicio de sesión solicitará un código seguro generado por una aplicación TOTP en su dispositivo
            </p>
            <Button type="button" :disabled="processing" @click="pendingAction = 'enable'">
                <Spinner v-if="processing" data-icon="inline-start" />
                <ShieldCheck v-else data-icon="inline-start" aria-hidden="true" />
                Activar 2FA
            </Button>
        </div>

        <div v-else-if="enabled" class="flex flex-col items-start justify-start gap-4">
            <p class="text-sm text-muted-foreground">
                El inicio de sesión solicitará un código temporal generado por la aplicación TOTP de su dispositivo
            </p>
            <Button variant="destructive" type="button" :disabled="processing" @click="pendingAction = 'disable'">
                <Spinner v-if="processing" data-icon="inline-start" /><ShieldOff v-else data-icon="inline-start" aria-hidden="true" />Desactivar 2FA
            </Button>
            <TwoFactorRecoveryCodes :codes="recoveryCodes" :processing="processing" @regenerate="regenerate" />
        </div>

        <PasswordConfirmDialog
            v-model:open="confirmOpen"
            :title="pendingAction === 'disable' ? 'Desactivar la verificación en dos pasos' : 'Activar la verificación en dos pasos'"
            description="Por seguridad, confirme su contraseña actual para continuar"
            :confirm-label="pendingAction === 'disable' ? 'Desactivar 2FA' : 'Continuar'"
            :destructive="pendingAction === 'disable'"
            @confirm="confirmPassword"
        />
        <TwoFactorSetupModal
            v-model:is-open="showSetupModal"
            :qr-code-svg="qrCodeSvg"
            :processing="processing"
            :error="error"
            @confirm="confirm"
        />
    </div>
</template>
