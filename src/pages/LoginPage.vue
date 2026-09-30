<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AuthSimpleLayout from '@/layouts/auth/AuthSimpleLayout.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ApiError } from '@/api/client';
import { login } from '@/api/session';
import { sessionState } from '@/state/session';
import { consumeIntendedRoute } from '@/lib/intended-route';
import { paths, roleEntry } from '@/lib/routes';
import { toast } from '@/lib/toast';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const remember = ref(false);
const errors = ref<Record<string, string[]>>({});
const error = ref<string | null>(null);
const processing = ref(false);

onMounted(() => {
  if (typeof route.query.status === 'string') toast.success(route.query.status);
});

const submit = async (): Promise<void> => {
  processing.value = true;
  error.value = null;
  errors.value = {};
  try {
    const result = await login(email.value, password.value, remember.value);
    if ('two_factor_required' in result) { await router.replace(paths.twoFactorChallenge); return; }
    sessionState.replace(result);
    await router.replace(consumeIntendedRoute() ?? roleEntry(result.active_role?.code));
  } catch (reason) {
    if (reason instanceof ApiError) { errors.value = reason.errors; error.value = reason.message; }
    else { error.value = 'No se pudo iniciar sesión.'; }
  } finally { processing.value = false; }
};
</script>

<template>
  <AuthSimpleLayout title="Iniciar sesión" description="Ingrese con la cuenta asignada por la institución.">
    <FeedbackAlert v-if="error && Object.keys(errors).length === 0" :message="error" />
    <form class="flex flex-col gap-6" @submit.prevent="submit">
      <FieldGroup>
        <Field :data-invalid="Boolean(errors.email || errors.correo_electronico)">
          <FieldLabel for="email" required>Correo institucional</FieldLabel>
          <Input id="email" v-model="email" type="email" name="email" required autocomplete="email" placeholder="Ej. nombre@ueb.edu.ec" :aria-invalid="Boolean(errors.email || errors.correo_electronico)" />
          <FieldError :errors="errors.email ?? errors.correo_electronico ?? [undefined]" />
        </Field>
        <Field :data-invalid="Boolean(errors.password)">
          <div class="flex items-center justify-between">
            <FieldLabel for="password" required>Contraseña</FieldLabel>
            <TextLink :href="paths.passwordRecovery" class="text-sm">¿Olvidó su contraseña?</TextLink>
          </div>
          <PasswordInput id="password" v-model="password" name="password" required autocomplete="current-password" placeholder="Contraseña" :aria-invalid="Boolean(errors.password)" />
          <FieldError :errors="errors.password ?? [undefined]" />
        </Field>
        <Field orientation="horizontal"><Checkbox id="remember" v-model="remember" /><FieldLabel for="remember" class="font-normal">Mantener la sesión iniciada</FieldLabel></Field>
        <Button type="submit" class="mt-4 w-full" :disabled="processing" data-test="login-button"><Spinner v-if="processing" />Ingresar</Button>
      </FieldGroup>
    </form>
  </AuthSimpleLayout>
</template>
