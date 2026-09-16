<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { closeDeviceSession, closeOtherDeviceSessions, confirmTwoFactor, disableTwoFactor, enableTwoFactor, getDeviceSessions, getTwoFactorStatus, regenerateRecoveryCodes, updatePassword, type DeviceSession, type TwoFactorStatus } from '@/api/session';
import { sessionState } from '@/state/session';

const status = ref<TwoFactorStatus | null>(null);
const sessions = ref<DeviceSession[]>([]);
const qrCodeSvg = ref<string | null>(null);
const confirmationCode = ref('');
const recoveryCodes = ref<string[]>([]);
const recoveryPassword = ref('');
const currentPassword = ref('');
const newPassword = ref('');
const passwordConfirmation = ref('');
const sessionsPassword = ref('');
const error = ref<string | null>(null);
const message = ref<string | null>(null);
const loading = ref(true);
const pending = ref(false);
const user = computed(() => sessionState.current.value?.user);
const activeRole = computed(() => sessionState.current.value?.active_role);
const formatDate = (value: string): string => new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const report = (reason: unknown, fallback: string): void => { error.value = reason instanceof ApiError ? reason.message : fallback; };
const loadSessions = async (): Promise<void> => { sessions.value = (await getDeviceSessions()).sessions; };

const load = async (): Promise<void> => {
  loading.value = true; error.value = null;
  try { await sessionState.load(); [status.value] = await Promise.all([getTwoFactorStatus(), loadSessions()]); }
  catch (reason) { report(reason, 'No se pudo cargar la configuración de la cuenta.'); }
  finally { loading.value = false; }
};
const changePassword = async (): Promise<void> => {
  error.value = null; message.value = null;
  if (newPassword.value !== passwordConfirmation.value) { error.value = 'Las contraseñas nuevas no coinciden.'; return; }
  pending.value = true;
  try {
    sessionState.replace(await updatePassword(newPassword.value, passwordConfirmation.value, currentPassword.value));
    currentPassword.value = ''; newPassword.value = ''; passwordConfirmation.value = ''; message.value = 'Contraseña actualizada.';
  } catch (reason) { report(reason, 'No se pudo actualizar la contraseña.'); } finally { pending.value = false; }
};
const enable = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { const result = await enableTwoFactor(); status.value = result; qrCodeSvg.value = result.qr_code_svg; message.value = 'Escanee el código y confirme con el código de seis dígitos.'; }
  catch (reason) { report(reason, 'No se pudo iniciar la configuración.'); } finally { pending.value = false; }
};
const confirm = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { const result = await confirmTwoFactor(confirmationCode.value); status.value = result; recoveryCodes.value = result.recovery_codes; qrCodeSvg.value = null; confirmationCode.value = ''; message.value = 'Segundo factor activado. Guarde los códigos de recuperación.'; }
  catch (reason) { report(reason, 'El código no es válido.'); } finally { pending.value = false; }
};
const disable = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { status.value = await disableTwoFactor(); recoveryCodes.value = []; message.value = 'Segundo factor desactivado.'; }
  catch (reason) { report(reason, 'No se pudo desactivar el segundo factor.'); } finally { pending.value = false; }
};
const regenerate = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { const result = await regenerateRecoveryCodes(recoveryPassword.value); recoveryCodes.value = result.recovery_codes; recoveryPassword.value = ''; message.value = 'Se generaron códigos nuevos; los anteriores dejaron de funcionar.'; }
  catch (reason) { report(reason, 'No se pudieron regenerar los códigos.'); } finally { pending.value = false; }
};
const closeSession = async (id: string): Promise<void> => {
  try { message.value = (await closeDeviceSession(id)).message; await loadSessions(); }
  catch (reason) { report(reason, 'No se pudo cerrar la sesión.'); }
};
const closeOthers = async (): Promise<void> => {
  pending.value = true; error.value = null;
  try { message.value = (await closeOtherDeviceSessions(sessionsPassword.value)).message; sessionsPassword.value = ''; await loadSessions(); }
  catch (reason) { report(reason, 'No se pudieron cerrar las otras sesiones.'); } finally { pending.value = false; }
};

onMounted(load);
</script>

<template>
  <main class="app-page settings-page">
    <header class="app-header"><div><p class="eyebrow">Configuración</p><h1>Cuenta y seguridad</h1></div></header>
    <p v-if="message" class="feedback success" role="status">{{ message }}</p><p v-if="error" class="feedback error" role="alert">{{ error }}</p><p v-if="loading" role="status">Cargando configuración de seguridad…</p>
    <section class="settings-section"><header><h2>Perfil institucional</h2><p>Su identidad solo puede ser modificada por Administración.</p></header><dl class="profile-details"><div><dt>Nombre</dt><dd>{{ user?.name }}</dd></div><div><dt>Correo</dt><dd>{{ user?.email }}</dd></div><div><dt>Ámbito activo</dt><dd>{{ activeRole?.career_name ?? activeRole?.code }}</dd></div></dl></section>
    <section class="settings-section"><header><h2>Contraseña</h2><p>Use una contraseña distinta a la actual.</p></header><form class="editor-form settings-form" @submit.prevent="changePassword"><label>Contraseña actual <input v-model="currentPassword" type="password" autocomplete="current-password" required /></label><label>Contraseña nueva <input v-model="newPassword" type="password" autocomplete="new-password" required /></label><label>Confirmar contraseña nueva <input v-model="passwordConfirmation" type="password" autocomplete="new-password" required /></label><button :disabled="pending" type="submit">Actualizar contraseña</button></form></section>
    <section class="settings-section"><header><h2>Verificación en dos pasos</h2><p>{{ status?.enabled ? 'Está activa.' : 'Proteja su cuenta con una aplicación autenticadora.' }}</p></header><button v-if="status && !status.enabled && !status.confirmation_required" :disabled="pending" type="button" @click="enable">Configurar segundo factor</button><div v-if="status?.confirmation_required" class="settings-form"><div v-if="qrCodeSvg" class="qr-code" v-html="qrCodeSvg"></div><label>Código de confirmación <input v-model="confirmationCode" inputmode="numeric" autocomplete="one-time-code" /></label><button :disabled="pending" type="button" @click="confirm">Confirmar segundo factor</button></div><div v-if="status?.enabled" class="settings-form"><label>Contraseña actual para generar códigos nuevos <input v-model="recoveryPassword" type="password" autocomplete="current-password" /></label><div class="header-actions"><button :disabled="pending || !recoveryPassword" type="button" @click="regenerate">Regenerar códigos</button><button :disabled="pending" type="button" @click="disable">Desactivar segundo factor</button></div></div><div v-if="recoveryCodes.length" class="recovery-codes"><h3>Códigos de recuperación nuevos</h3><p>Guárdelos ahora; no volverán a mostrarse.</p><code v-for="code in recoveryCodes" :key="code">{{ code }}</code></div></section>
    <section class="settings-section"><header><h2>Sesiones abiertas</h2><p>Revise dónde está abierta su cuenta y cierre accesos que no reconozca.</p></header><div class="session-list"><article v-for="deviceSession in sessions" :key="deviceSession.id"><div><strong>{{ deviceSession.device }}</strong><p>{{ deviceSession.ip_address ?? 'IP no disponible' }} · {{ formatDate(deviceSession.last_activity) }}</p></div><span v-if="deviceSession.current" class="role-badge">Esta sesión</span><button v-else type="button" @click="closeSession(deviceSession.id)">Cerrar</button></article></div><form v-if="sessions.some((item) => !item.current)" class="editor-form settings-form" @submit.prevent="closeOthers"><label>Contraseña actual <input v-model="sessionsPassword" type="password" autocomplete="current-password" required /></label><button :disabled="pending" type="submit">Cerrar las demás sesiones</button></form></section>
  </main>
</template>
