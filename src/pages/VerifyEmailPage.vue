<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError } from '@/api/client';
import { verifyEmail } from '@/api/session';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

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
  <AuthSimpleLayout title="Verificación de correo" description="Confirmamos la dirección institucional asociada a su cuenta.">
    <div class="flex flex-col gap-5 text-center">
      <p v-if="message" class="text-sm" role="status">{{ message }}</p><p v-else-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p><p v-else class="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner />Verificando correo…</p>
      <Button as-child><RouterLink to="/ingresar">Iniciar sesión</RouterLink></Button>
    </div>
  </AuthSimpleLayout>
</template>
