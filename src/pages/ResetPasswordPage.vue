<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { resetForgottenPassword } from '@/api/session';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';

const route = useRoute();
const router = useRouter();
const email = computed(() => typeof route.query.email === 'string' ? route.query.email : '');
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '');
const password = ref('');
const passwordConfirmation = ref('');
const error = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const pending = ref(false);

const submit = async (): Promise<void> => {
  if (!email.value || !token.value) {
    error.value = 'El enlace de recuperación está incompleto.';
    return;
  }
  pending.value = true;
  error.value = null;
  errors.value = {};
  try {
    const result = await resetForgottenPassword(email.value, token.value, password.value, passwordConfirmation.value);
    password.value = '';
    passwordConfirmation.value = '';
    await router.replace({ path: paths.login, query: { status: result.message } });
  } catch (reason) {
    if (reason instanceof ApiError) {
      errors.value = reason.errors;
      error.value = reason.message;
    } else {
      error.value = 'No se pudo restablecer la contraseña.';
    }
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <AuthSimpleLayout title="Restablecer contraseña" description="Ingrese su nueva contraseña">
    <form @submit.prevent="submit">
      <div class="grid gap-6">
        <div class="grid gap-2"><Label for="reset-email" required>Correo electrónico</Label><Input id="reset-email" type="email" :model-value="email" autocomplete="email" class="mt-1 block w-full" placeholder="Ej. nombre@ueb.edu.ec" readonly required /><InputError :message="errors.email?.[0]" class="mt-2" /></div>
        <div class="grid gap-2"><Label for="new-password" required>Contraseña nueva</Label><PasswordInput id="new-password" v-model="password" required autocomplete="new-password" class="mt-1 block w-full" placeholder="Contraseña nueva" :aria-invalid="Boolean(errors.password)" /><InputError :message="errors.password?.[0]" /></div>
        <div class="grid gap-2"><Label for="new-password-confirmation" required>Confirmar contraseña</Label><PasswordInput id="new-password-confirmation" v-model="passwordConfirmation" required autocomplete="new-password" class="mt-1 block w-full" placeholder="Confirmar contraseña" :aria-invalid="Boolean(errors.password_confirmation)" /><InputError :message="errors.password_confirmation?.[0]" /></div>
        <FeedbackAlert v-if="error && Object.keys(errors).length === 0" :message="error" />
        <Button type="submit" class="mt-4 w-full" :disabled="pending || !email || !token" data-test="reset-password-button"><Spinner v-if="pending" />Restablecer contraseña</Button>
      </div>
    </form>
  </AuthSimpleLayout>
</template>
