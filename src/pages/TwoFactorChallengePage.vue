<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { completeTwoFactorLogin } from '@/api/session';
import { sessionState } from '@/state/session';
import { consumeIntendedRoute } from '@/lib/intended-route';
import { roleEntry } from '@/lib/routes';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

const router = useRouter();
const code = ref('');
const showRecoveryInput = ref(false);
const error = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const pending = ref(false);
const content = computed(() => showRecoveryInput.value
  ? {
      title: 'Código de recuperación',
      description: 'Confirme el acceso con uno de sus códigos de recuperación.',
      buttonText: 'usar un código de autenticación',
    }
  : {
      title: 'Código de autenticación',
      description: 'Ingrese el código proporcionado por su aplicación de autenticación.',
      buttonText: 'usar un código de recuperación',
    });

const toggleMode = (): void => {
  showRecoveryInput.value = !showRecoveryInput.value;
  code.value = '';
  error.value = null;
  errors.value = {};
};

const submit = async (): Promise<void> => {
  pending.value = true;
  error.value = null;
  errors.value = {};
  try {
    await completeTwoFactorLogin(
      showRecoveryInput.value ? '' : code.value,
      showRecoveryInput.value ? code.value : '',
    );
    const session = await sessionState.load(true);
    await router.replace(consumeIntendedRoute() ?? roleEntry(session?.active_role?.code));
  } catch (reason) {
    if (reason instanceof ApiError) {
      errors.value = reason.errors;
      error.value = reason.message;
    } else {
      error.value = 'No se pudo verificar el código.';
    }
  } finally {
    pending.value = false;
  }
};
</script>

<template>
  <AuthSimpleLayout :title="content.title" :description="content.description">
    <div class="flex flex-col gap-6">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div v-if="!showRecoveryInput" class="flex flex-col items-center justify-center gap-3 text-center">
          <Label for="otp" required>Código de autenticación</Label>
          <div class="flex w-full items-center justify-center">
            <InputOTP id="otp" v-model="code" :maxlength="6" :disabled="pending" aria-required="true" aria-label="Código de autenticación de seis dígitos">
              <InputOTPGroup><InputOTPSlot v-for="index in 6" :key="index" :index="index - 1" /></InputOTPGroup>
            </InputOTP>
          </div>
          <InputError :message="errors.code?.[0]" />
        </div>
        <div v-else class="grid gap-2">
          <Label for="recovery-code" required>Código de recuperación</Label>
          <Input id="recovery-code" v-model="code" type="text" autocomplete="one-time-code" placeholder="Ej. ABCD-EFGH" required :disabled="pending" />
          <InputError :message="errors.recovery_code?.[0]" />
        </div>
        <FeedbackAlert v-if="error && Object.keys(errors).length === 0" :message="error" />
        <Button type="submit" class="w-full" :disabled="pending || !code">Continuar</Button>
        <div class="text-center text-sm text-muted-foreground"><span>También puede </span><Button type="button" variant="link" class="h-auto p-0 text-foreground underline decoration-border underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current" @click="toggleMode">{{ content.buttonText }}</Button></div>
      </form>
    </div>
  </AuthSimpleLayout>
</template>
