<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSession, logout, resendEmailVerification, selectActiveRole, updatePassword, type Session } from '@/api/session';
import { sessionState } from '@/state/session';
import { ArrowRight, CheckCircle2, LogOut, Save } from '@lucide/vue';
import PageFrame from '@/components/domain/PageFrame.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const router = useRouter();
const session = ref<Session | null>(null);
const error = ref<string | null>(null);
const password = ref('');
const passwordConfirmation = ref('');
const passwordError = ref<string | null>(null);
const changingPassword = ref(false);
const verificationMessage = ref<string | null>(null);

const load = async (): Promise<void> => {
  try {
    session.value = await getSession();
    sessionState.replace(session.value);
    if (session.value.active_role && !session.value.user.must_change_password) {
      await router.replace('/panel');
      return;
    }
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) {
      await router.replace('/ingresar');
      return;
    }
    error.value = 'No se pudo cargar su sesión.';
  }
};

const selectRole = async (roleAssignmentId: string): Promise<void> => {
  error.value = null;
  try {
    session.value = await selectActiveRole(roleAssignmentId);
    sessionState.replace(session.value);
    await router.replace('/panel');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo seleccionar el ámbito de trabajo.';
  }
};

const savePassword = async (): Promise<void> => {
  passwordError.value = null;

  if (password.value !== passwordConfirmation.value) {
    passwordError.value = 'Las contraseñas no coinciden.';
    return;
  }

  changingPassword.value = true;
  try {
    session.value = await updatePassword(password.value, passwordConfirmation.value);
    sessionState.replace(session.value);
    password.value = '';
    passwordConfirmation.value = '';
  } catch (reason) {
    passwordError.value = reason instanceof ApiError ? reason.message : 'No se pudo actualizar la contraseña.';
  } finally {
    changingPassword.value = false;
  }
};

const closeSession = async (): Promise<void> => {
  error.value = null;
  try {
    await logout();
    sessionState.clear();
    await router.replace('/ingresar');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo cerrar la sesión.';
  }
};

const resendVerification = async (): Promise<void> => {
  error.value = null;
  try {
    verificationMessage.value = (await resendEmailVerification()).message;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo reenviar el enlace de verificación.';
  }
};

onMounted(load);
</script>

<template>
  <PageFrame v-if="session" :title="`Bienvenida, ${session.user.name}`" :description="session.available_roles.some((role) => role.code === 'coordinador') ? 'Seleccione la carrera y el ámbito con el que trabajará en esta sesión.' : 'Seleccione el ámbito con el que trabajará en esta sesión.'" size="wide">
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <template v-else-if="session">
      <Alert v-if="!session.user.email_verified"><AlertTitle>Verifique su correo institucional</AlertTitle><AlertDescription class="space-y-3"><p>Necesitamos confirmar {{ session.user.email }} para completar su acceso.</p><p v-if="verificationMessage" role="status">{{ verificationMessage }}</p><Button type="button" size="sm" @click="resendVerification">Reenviar enlace</Button></AlertDescription></Alert>
      <Alert v-else-if="session.available_roles.length === 0"><AlertTitle>No tiene asignaciones vigentes</AlertTitle><AlertDescription>Contáctese con el coordinador de la carrera.</AlertDescription></Alert>
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card v-for="role in session.available_roles" :key="role.id" class="h-full">
          <CardHeader><CardTitle>{{ role.career_name ?? role.code }}</CardTitle><CardAction><Badge v-if="session.active_role?.id === role.id" variant="secondary"><CheckCircle2 />Activo</Badge><Badge v-else variant="outline">{{ role.code }}</Badge></CardAction></CardHeader>
          <CardFooter class="mt-auto"><Button class="w-full" type="button" @click="selectRole(role.id)"><ArrowRight />{{ session.active_role?.id === role.id ? 'Continuar aquí' : role.code === 'coordinador' ? 'Entrar a esta carrera' : `Entrar como ${role.code}` }}</Button></CardFooter>
        </Card>
      </div>
      <Dialog :open="session.user.must_change_password"><DialogContent class="sm:max-w-md"><DialogHeader><DialogTitle>Cambie su contraseña temporal</DialogTitle><DialogDescription>La contraseña con la que entró la generó quien creó su cuenta. Defina una propia para continuar.</DialogDescription></DialogHeader>
        <form class="space-y-4" @submit.prevent="savePassword">
          <div class="grid gap-2">
            <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -- PasswordInput transmite el id al input -->
            <Label for="temporary-new-password" required>Contraseña nueva</Label>
            <PasswordInput id="temporary-new-password" v-model="password" autocomplete="new-password" required />
          </div>
          <div class="grid gap-2">
            <!-- eslint-disable-next-line vuejs-accessibility/label-has-for -- PasswordInput transmite el id al input -->
            <Label for="temporary-password-confirmation" required>Confirmar contraseña nueva</Label>
            <PasswordInput id="temporary-password-confirmation" v-model="passwordConfirmation" autocomplete="new-password" required />
          </div>
          <p v-if="passwordError" class="text-sm text-destructive" role="alert">{{ passwordError }}</p>
          <div class="flex items-center justify-between gap-4 pt-2"><Button type="button" variant="ghost" @click="closeSession"><LogOut />Cerrar sesión</Button><Button type="submit" :disabled="changingPassword"><Spinner v-if="changingPassword" /><Save v-else />Guardar y continuar</Button></div>
        </form>
      </DialogContent></Dialog>
    </template>
  </PageFrame>
  <p v-else class="p-6 text-sm text-muted-foreground" role="status">Cargando…</p>
</template>
