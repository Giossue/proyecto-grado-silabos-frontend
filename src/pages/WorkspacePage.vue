<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getSession, selectActiveRole, type Session } from '@/api/session';

const router = useRouter();
const session = ref<Session | null>(null);
const error = ref<string | null>(null);

const load = async (): Promise<void> => {
  try {
    session.value = await getSession();
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
};

onMounted(load);
</script>

<template>
  <main class="workspace-page">
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-else-if="session">
      <h1>Bienvenida, {{ session.user.name }}</h1>
      <p v-if="session.user.must_change_password">Debe cambiar su contraseña temporal antes de continuar.</p>
      <section v-if="!session.active_role">
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
