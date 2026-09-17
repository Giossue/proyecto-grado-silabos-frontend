<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { requestPasswordRecovery } from '@/api/session';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const email = ref('');
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const pending = ref(false);

const submit = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  errors.value = {};
  try {
    message.value = (await requestPasswordRecovery(email.value)).message;
  } catch (reason) {
    if (reason instanceof ApiError) {
      errors.value = reason.errors;
      error.value = reason.message;
    } else {
      error.value = 'No se pudo solicitar el restablecimiento.';
    }
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <AuthSimpleLayout title="Recuperar contraseña" description="Ingrese su correo para recibir un enlace de restablecimiento">
    <div v-if="message" class="mb-4 text-center text-sm font-medium text-green-600" role="status">{{ message }}</div>
    <div class="space-y-6">
      <form @submit.prevent="submit">
        <div class="grid gap-2">
          <Label for="recovery-email" required>Correo electrónico</Label>
          <Input id="recovery-email" v-model="email" type="email" autocomplete="off" required placeholder="Ej. nombre@ueb.edu.ec" :aria-invalid="Boolean(errors.email)" />
          <InputError :message="errors.email?.[0]" />
        </div>
        <p v-if="error && Object.keys(errors).length === 0" class="mt-2 text-sm text-destructive" role="alert">{{ error }}</p>
        <div class="my-6 flex items-center justify-start">
          <Button class="w-full" :disabled="pending" type="submit" data-test="email-password-reset-link-button"><Spinner v-if="pending" />Enviar enlace de restablecimiento</Button>
        </div>
      </form>
      <div class="space-x-1 text-center text-sm text-muted-foreground"><span>O vuelva a</span><RouterLink to="/login" class="text-foreground underline decoration-neutral-300 underline-offset-4 hover:decoration-current dark:decoration-neutral-500">iniciar sesión</RouterLink></div>
    </div>
  </AuthSimpleLayout>
</template>
