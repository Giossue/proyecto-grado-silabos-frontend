<script setup lang="ts">
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import { requestPasswordRecovery } from '@/api/session';

const email = ref('');
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const submit = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  try {
    message.value = (await requestPasswordRecovery(email.value)).message;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo solicitar el restablecimiento.';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Recuperar acceso</h1>
      <p>Le enviaremos un enlace seguro a su correo institucional.</p>
      <label>
        Correo electrónico
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <p v-if="message" class="save-status" role="status">{{ message }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="pending" type="submit">{{ pending ? 'Enviando…' : 'Enviar enlace' }}</button>
      <RouterLink class="back-link" to="/ingresar">Volver a ingresar</RouterLink>
    </form>
  </main>
</template>
