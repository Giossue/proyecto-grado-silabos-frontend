<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { completeTwoFactorLogin } from '@/api/session';

const router = useRouter();
const code = ref('');
const recoveryCode = ref('');
const error = ref<string | null>(null);
const pending = ref(false);

const submit = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  try {
    await completeTwoFactorLogin(code.value, recoveryCode.value);
    await router.replace('/');
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo verificar el código.';
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <main class="auth-page">
    <form class="auth-card" @submit.prevent="submit">
      <h1>Verificación en dos pasos</h1>
      <p>Ingrese el código de su aplicación autenticadora o un código de recuperación.</p>
      <label>
        Código de autenticación
        <input v-model="code" inputmode="numeric" autocomplete="one-time-code" />
      </label>
      <label>
        Código de recuperación
        <input v-model="recoveryCode" autocomplete="one-time-code" />
      </label>
      <p v-if="error" role="alert">{{ error }}</p>
      <button :disabled="pending" type="submit">{{ pending ? 'Verificando…' : 'Continuar' }}</button>
      <RouterLink class="back-link" to="/ingresar">Volver a ingresar</RouterLink>
    </form>
  </main>
</template>
