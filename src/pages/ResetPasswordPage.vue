<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { resetForgottenPassword } from '@/api/session';

const route = useRoute();
const email = computed(() => typeof route.query.email === 'string' ? route.query.email : '');
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '');
const password = ref('');
const passwordConfirmation = ref('');
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const submit = async (): Promise<void> => {
  if (!email.value || !token.value) {
    error.value = 'El enlace de recuperación está incompleto.';
    return;
  }
  pending.value = true;
  error.value = null;
  try {
    message.value = (await resetForgottenPassword(email.value, token.value, password.value, passwordConfirmation.value)).message;
    password.value = '';
    passwordConfirmation.value = '';
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo restablecer la contraseña.';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Definir contraseña nueva</h1>
      <p>{{ email || 'Enlace de recuperación inválido.' }}</p>
      <label>
        Contraseña nueva
        <input v-model="password" type="password" autocomplete="new-password" required />
      </label>
      <label>
        Confirmar contraseña nueva
        <input v-model="passwordConfirmation" type="password" autocomplete="new-password" required />
      </label>
      <p v-if="message" class="save-status" role="status">{{ message }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="pending || !email || !token" type="submit">{{ pending ? 'Guardando…' : 'Restablecer contraseña' }}</button>
      <RouterLink v-if="message" class="back-link" to="/ingresar">Ingresar</RouterLink>
    </form>
  </main>
</template>
