<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { verifyEmail } from '@/api/session';

const route = useRoute();
const message = ref<string | null>(null);
const error = ref<string | null>(null);
const userId = computed(() => typeof route.params.user === 'string' ? route.params.user : '');
const hash = computed(() => typeof route.params.hash === 'string' ? route.params.hash : '');

onMounted(async () => {
  if (!userId.value || !hash.value) {
    error.value = 'El enlace de verificación está incompleto.';
    return;
  }
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(route.query)) {
      if (typeof value === 'string') query.set(key, value);
    }
    message.value = (await verifyEmail(userId.value, hash.value, query)).message;
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo verificar el correo.';
  }
});
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <h1>Verificación de correo</h1>
      <p v-if="message" class="save-status" role="status">{{ message }}</p>
      <p v-else-if="error" role="alert">{{ error }}</p>
      <p v-else>Verificando correo…</p>
      <RouterLink class="back-link" to="/ingresar">Ingresar</RouterLink>
    </section>
  </main>
</template>
