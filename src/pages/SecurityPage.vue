<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { confirmTwoFactor, disableTwoFactor, enableTwoFactor, getSession, getTwoFactorStatus, type TwoFactorStatus } from '@/api/session';

const router = useRouter();
const status = ref<TwoFactorStatus | null>(null);
const qrCodeSvg = ref<string | null>(null);
const confirmationCode = ref('');
const recoveryCodes = ref<string[]>([]);
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const pending = ref(false);

const load = async (): Promise<void> => {
  try {
    await getSession();
    status.value = await getTwoFactorStatus();
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) {
      await router.replace('/ingresar');
      return;
    }
    error.value = 'No se pudo cargar la configuración de seguridad.';
  }
};

const enable = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  try {
    const result = await enableTwoFactor();
    status.value = result;
    qrCodeSvg.value = result.qr_code_svg;
    message.value = 'Escanee el código y confirme con el código de seis dígitos.';
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo iniciar la configuración.';
  } finally {
    pending.value = false;
  }
};

const confirm = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  try {
    const result = await confirmTwoFactor(confirmationCode.value);
    status.value = result;
    recoveryCodes.value = result.recovery_codes;
    qrCodeSvg.value = null;
    confirmationCode.value = '';
    message.value = 'Segundo factor activado. Guarde los códigos de recuperación en un lugar seguro.';
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'El código no es válido.';
  } finally {
    pending.value = false;
  }
};

const disable = async (): Promise<void> => {
  pending.value = true;
  try {
    status.value = await disableTwoFactor();
    recoveryCodes.value = [];
    message.value = 'Segundo factor desactivado.';
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo desactivar el segundo factor.';
  } finally {
    pending.value = false;
  }
};

onMounted(load);
</script>

<template>
  <main class="app-page">
    <header class="app-header"><h1>Seguridad de la cuenta</h1><RouterLink class="back-link" to="/">Volver</RouterLink></header>
    <section class="detail-card">
      <h2>Verificación en dos pasos</h2>
      <p v-if="status?.enabled">La verificación en dos pasos está activa.</p>
      <p v-else>Proteja su cuenta con una aplicación autenticadora.</p>
      <p v-if="message" class="save-status" role="status">{{ message }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button v-if="status && !status.enabled && !status.confirmation_required" :disabled="pending" type="button" @click="enable">Configurar segundo factor</button>
      <template v-if="status?.confirmation_required">
        <div v-if="qrCodeSvg" class="qr-code" v-html="qrCodeSvg"></div>
        <label> Código de confirmación <input v-model="confirmationCode" inputmode="numeric" autocomplete="one-time-code" /></label>
        <button :disabled="pending" type="button" @click="confirm">Confirmar segundo factor</button>
      </template>
      <button v-if="status?.enabled" :disabled="pending" type="button" @click="disable">Desactivar segundo factor</button>
      <section v-if="recoveryCodes.length" class="recovery-codes"><h3>Códigos de recuperación</h3><code v-for="recoveryCode in recoveryCodes" :key="recoveryCode">{{ recoveryCode }}</code></section>
    </section>
  </main>
</template>
