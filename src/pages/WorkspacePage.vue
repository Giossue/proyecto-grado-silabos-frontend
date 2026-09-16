<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSession, logout, resendEmailVerification, selectActiveRole, updatePassword, type Session } from '@/api/session';

const router = useRouter();
const session = ref<Session | null>(null);
const error = ref<string | null>(null);
const password = ref('');
const passwordConfirmation = ref('');
const passwordError = ref<string | null>(null);
const changingPassword = ref(false);
const verificationMessage = ref<string | null>(null);

const load = async (): Promise<void> => {
  try {
    session.value = await getSession();
    if (session.value.active_role && !session.value.user.must_change_password) {
      await router.replace('/panel');
      return;
    }
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) {
      await router.replace('/ingresar');
      return;
    }
    error.value = 'No se pudo cargar su sesión.';
  }
};

const selectRole = async (roleAssignmentId: string): Promise<void> => {
  session.value = await selectActiveRole(roleAssignmentId);
  await router.replace('/panel');
};

const savePassword = async (): Promise<void> => {
  passwordError.value = null;

  if (password.value !== passwordConfirmation.value) {
    passwordError.value = 'Las contraseñas no coinciden.';
    return;
  }

  changingPassword.value = true;
  try {
    session.value = await updatePassword(password.value, passwordConfirmation.value);
    password.value = '';
    passwordConfirmation.value = '';
  } catch (reason) {
    passwordError.value = reason instanceof ApiError ? reason.message : 'No se pudo actualizar la contraseña.';
  } finally {
    changingPassword.value = false;
  }
};

const closeSession = async (): Promise<void> => {
  await logout();
  await router.replace('/ingresar');
};

const resendVerification = async (): Promise<void> => {
  verificationMessage.value = (await resendEmailVerification()).message;
};

onMounted(load);
</script>

<template>
  <main class="workspace-page">
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="session">
      <header class="workspace-header">
        <h1>Bienvenida, {{ session.user.name }}</h1>
        <div class="header-actions"><RouterLink class="back-link" to="/seguridad">Seguridad</RouterLink><button type="button" @click="closeSession">Cerrar sesión</button></div>
      </header>
      <section v-if="!session.user.email_verified" class="password-card">
        <h2>Verifique su correo institucional</h2>
        <p>Necesitamos confirmar {{ session.user.email }} para completar su acceso.</p>
        <p v-if="verificationMessage" class="save-status" role="status">{{ verificationMessage }}</p>
        <button type="button" @click="resendVerification">Reenviar enlace</button>
      </section>
      <form v-if="session.user.must_change_password" class="password-card" @submit.prevent="savePassword">
        <h2>Cambie su contraseña temporal</h2>
        <p>Defina una contraseña nueva para continuar.</p>
        <label>
          Contraseña nueva
          <input v-model="password" type="password" autocomplete="new-password" required />
        </label>
        <label>
          Confirmar contraseña nueva
          <input v-model="passwordConfirmation" type="password" autocomplete="new-password" required />
        </label>
        <p v-if="passwordError" role="alert">{{ passwordError }}</p>
        <button :disabled="changingPassword" type="submit">
          {{ changingPassword ? 'Guardando…' : 'Guardar y continuar' }}
        </button>
      </form>
      <section v-else-if="!session.active_role">
        <h2>Seleccione su ámbito de trabajo</h2>
        <button v-for="role in session.available_roles" :key="role.id" @click="selectRole(role.id)">
          {{ role.code }}<span v-if="role.career_name"> · {{ role.career_name }}</span>
        </button>
      </section>
      <section v-else>
        <h2>{{ session.active_role.code }}</h2>
        <p>{{ session.active_role.career_name ?? 'Ámbito institucional' }}</p>
      </section>
    </template>
    <p v-else>Cargando…</p>
  </main>
</template>
