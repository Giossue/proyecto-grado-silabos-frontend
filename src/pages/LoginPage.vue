<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { login } from '@/api/session';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const pending = ref(false);

const submit = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  try {
    await login(email.value, password.value);
    await router.replace('/');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo iniciar sesión.';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Sílabos UEB</h1>
      <p>Ingrese con sus credenciales institucionales.</p>
      <label>
        Correo electrónico
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Contraseña
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="pending" type="submit">
        {{ pending ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  </main>
</template>
