<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ApiError } from '@/api/client';
import { closeDeviceSession, closeOtherDeviceSessions, confirmTwoFactor, disableTwoFactor, enableTwoFactor, getDeviceSessions, getTwoFactorStatus, regenerateRecoveryCodes, updatePassword, type DeviceSession, type TwoFactorStatus } from '@/api/session';
import { sessionState } from '@/state/session';
import Heading from '@/components/Heading.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsLayout from '@/layouts/settings/Layout.vue';

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
  <SettingsLayout>
    <p v-if="message" class="text-sm text-foreground" role="status">{{ message }}</p><p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p><p v-if="loading" class="text-sm text-muted-foreground" role="status">Cargando configuración de seguridad…</p>
    <div class="space-y-6"><Heading variant="small" title="Actualizar contraseña" description="Use una contraseña larga y única para proteger su cuenta" />
      <form class="space-y-6" @submit.prevent="changePassword">
        <div class="grid gap-2"><Label for="current-password" required>Contraseña actual</Label><PasswordInput id="current-password" v-model="currentPassword" autocomplete="current-password" required /></div>
        <div class="grid gap-2"><Label for="new-password-security" required>Contraseña nueva</Label><PasswordInput id="new-password-security" v-model="newPassword" autocomplete="new-password" required /></div>
        <div class="grid gap-2"><Label for="confirm-password-security" required>Confirmar contraseña</Label><PasswordInput id="confirm-password-security" v-model="passwordConfirmation" autocomplete="new-password" required /></div>
        <Button :disabled="pending" type="submit">Guardar</Button>
      </form>
    </div>
    <div class="space-y-6"><Heading variant="small" title="Verificación en dos pasos" :description="status?.enabled ? 'Está activa.' : 'Proteja su cuenta con una aplicación autenticadora.'" />
      <Button v-if="status && !status.enabled && !status.confirmation_required" :disabled="pending" type="button" @click="enable">Configurar segundo factor</Button>
      <div v-if="status?.confirmation_required" class="space-y-4"><div v-if="qrCodeSvg" class="w-fit rounded-lg border bg-white p-4" v-html="qrCodeSvg"></div><div class="grid gap-2"><Label for="confirmation-code">Código de confirmación</Label><Input id="confirmation-code" v-model="confirmationCode" inputmode="numeric" autocomplete="one-time-code" /></div><Button :disabled="pending" type="button" @click="confirm">Confirmar segundo factor</Button></div>
      <div v-if="status?.enabled" class="space-y-4"><div class="grid gap-2"><Label for="recovery-password">Contraseña actual para generar códigos nuevos</Label><PasswordInput id="recovery-password" v-model="recoveryPassword" autocomplete="current-password" /></div><div class="flex flex-wrap gap-2"><Button :disabled="pending || !recoveryPassword" type="button" @click="regenerate">Regenerar códigos</Button><Button :disabled="pending" type="button" variant="destructive" @click="disable">Desactivar segundo factor</Button></div></div>
      <Card v-if="recoveryCodes.length"><CardContent class="space-y-3"><h3 class="font-medium">Códigos de recuperación nuevos</h3><p class="text-sm text-muted-foreground">Guárdelos ahora; no volverán a mostrarse.</p><div class="grid gap-1 font-mono text-sm"><code v-for="code in recoveryCodes" :key="code">{{ code }}</code></div></CardContent></Card>
    </div>
    <div class="space-y-6"><Heading variant="small" title="Sesiones abiertas" description="Revise dónde está abierta su cuenta y cierre accesos que no reconozca." />
      <div class="space-y-3"><article v-for="deviceSession in sessions" :key="deviceSession.id" class="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><strong class="text-sm">{{ deviceSession.device }}</strong><p class="text-xs text-muted-foreground">{{ deviceSession.ip_address ?? 'IP no disponible' }} · {{ formatDate(deviceSession.last_activity) }}</p></div><Badge v-if="deviceSession.current" variant="secondary">Esta sesión</Badge><Button v-else type="button" size="sm" variant="outline" @click="closeSession(deviceSession.id)">Cerrar</Button></article></div>
      <form v-if="sessions.some((item) => !item.current)" class="space-y-4" @submit.prevent="closeOthers"><div class="grid gap-2"><Label for="sessions-password">Contraseña actual</Label><PasswordInput id="sessions-password" v-model="sessionsPassword" autocomplete="current-password" required /></div><Button :disabled="pending" type="submit" variant="outline">Cerrar las demás sesiones</Button></form>
    </div>
  </SettingsLayout>
</template>
