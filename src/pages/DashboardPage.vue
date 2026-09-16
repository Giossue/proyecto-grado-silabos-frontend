<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import { getDashboard, type Dashboard } from '@/api/dashboard';
import { getSession, logout, type Session } from '@/api/session';

const router = useRouter();
const session = ref<Session | null>(null);
const dashboard = ref<Dashboard | null>(null);
const error = ref<string | null>(null);

const load = async (): Promise<void> => {
  try {
    session.value = await getSession();

    if (session.value.user.must_change_password || !session.value.active_role) {
      await router.replace('/');
      return;
    }

    dashboard.value = await getDashboard();
  } catch (reason) {
    if (reason instanceof ApiError && [401, 409].includes(reason.status)) {
      await router.replace('/');
      return;
    }

    error.value = 'No se pudo cargar el panel de trabajo.';
  }
};

const closeSession = async (): Promise<void> => {
  await logout();
  await router.replace('/ingresar');
};

onMounted(load);
</script>

<template>
  <main class="app-page">
    <template v-if="session && dashboard">
      <header class="app-header">
        <div>
          <p class="eyebrow">Sílabos UEB</p>
          <h1>Panel de trabajo</h1>
          <p>{{ session.active_role?.career_name ?? 'Gestión institucional de Sílabos UEB' }}</p>
        </div>
        <div class="header-actions">
          <span class="role-badge">{{ session.active_role?.code }}</span>
          <RouterLink class="back-link" to="/notificaciones">Notificaciones</RouterLink>
          <button type="button" @click="closeSession">Cerrar sesión</button>
        </div>
      </header>

      <section v-if="dashboard.setup" class="setup-card" aria-labelledby="setup-title">
        <div class="setup-heading">
          <div>
            <h2 id="setup-title">{{ dashboard.setup.title }}</h2>
            <p>{{ dashboard.setup.intro }}</p>
          </div>
          <strong>{{ dashboard.setup.done }}/{{ dashboard.setup.total }}</strong>
        </div>
        <ol class="setup-list">
          <li v-for="step in dashboard.setup.steps" :key="step.key">
            <span :aria-label="step.done ? 'Completado' : 'Pendiente'">{{ step.done ? '✓' : '○' }}</span>
            <div>
              <strong>{{ step.label }}</strong>
              <p>{{ step.hint }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section class="metrics" aria-label="Indicadores del panel">
        <article v-for="metric in dashboard.metrics" :key="metric.key" class="metric-card">
          <p>{{ metric.label }}</p>
          <strong>{{ metric.value }}<small v-if="metric.suffix"> {{ metric.suffix }}</small></strong>
          <span>{{ metric.hint }}</span>
        </article>
      </section>
      <RouterLink v-if="session.active_role?.code === 'docente'" class="primary-link" to="/mis-silabos">
        Ver mis sílabos
      </RouterLink>
      <RouterLink v-if="session.active_role?.code === 'administrador'" class="primary-link" to="/administracion/usuarios">
        Administrar usuarios
      </RouterLink>
      <RouterLink v-if="session.active_role?.code === 'administrador'" class="primary-link" to="/administracion/estructura-academica">
        Gestionar estructura académica
      </RouterLink>
      <RouterLink v-if="session.active_role?.code === 'administrador'" class="primary-link" to="/administracion/procesos">
        Gestionar proceso institucional
      </RouterLink>
    </template>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else>Cargando panel…</p>
  </main>
</template>
