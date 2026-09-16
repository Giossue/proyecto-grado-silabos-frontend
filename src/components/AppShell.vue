<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getNotifications } from "@/api/notifications";
import { logout, selectActiveRole } from "@/api/session";
import { sessionState } from "@/state/session";

type NavigationItem = { label: string; to: string };

const router = useRouter();
const unreadCount = ref(0);
const scopeOpen = ref(false);
const menuOpen = ref(false);
const theme = ref<"light" | "dark">("light");

const navigation = computed<NavigationItem[]>(() => {
  switch (sessionState.current.value?.active_role?.code) {
    case "administrador":
      return [
        { label: "Panel", to: "/panel" },
        { label: "Usuarios", to: "/administracion/usuarios" },
        {
          label: "Estructura académica",
          to: "/administracion/estructura-academica",
        },
        { label: "Procesos", to: "/administracion/procesos" },
        { label: "Plantilla", to: "/administracion/plantilla" },
        { label: "Auditoría", to: "/administracion/auditoria" },
        { label: "Trabajos", to: "/administracion/trabajos" },
      ];
    case "coordinador":
      return [
        { label: "Panel", to: "/panel" },
        { label: "Convocatorias", to: "/coordinacion/convocatorias" },
        { label: "Revisiones", to: "/coordinacion/revisiones" },
        { label: "Fuentes", to: "/coordinacion/fuentes" },
        { label: "Configuración IA", to: "/coordinacion/configuracion-ia" },
        {
          label: "Estructura académica",
          to: "/coordinacion/estructura-academica",
        },
        { label: "Informes", to: "/coordinacion/informes" },
      ];
    case "docente":
      return [
        { label: "Panel", to: "/panel" },
        { label: "Mis sílabos", to: "/mis-silabos" },
      ];
    default:
      return [];
  }
});

const roleLabel = computed(() => {
  const role = sessionState.current.value?.active_role;
  if (!role) return "";
  const names = {
    administrador: "Administración",
    coordinador: "Coordinación",
    docente: "Docencia",
  };
  return `${names[role.code]}${role.career_name ? ` · ${role.career_name}` : ""}`;
});

const applyTheme = (value: "light" | "dark"): void => {
  theme.value = value;
  document.documentElement.dataset.theme = value;
  localStorage.setItem("silabos-theme", value);
};

const toggleTheme = (): void =>
  applyTheme(theme.value === "light" ? "dark" : "light");

const switchScope = async (assignmentId: string): Promise<void> => {
  sessionState.replace(await selectActiveRole(assignmentId));
  scopeOpen.value = false;
  await router.push("/panel");
};

const closeSession = async (): Promise<void> => {
  await logout();
  sessionState.clear();
  await router.replace("/ingresar");
};

onMounted(async () => {
  applyTheme(
    localStorage.getItem("silabos-theme") === "dark" ? "dark" : "light",
  );
  try {
    unreadCount.value = (await getNotifications("unread")).unread_count;
  } catch {
    unreadCount.value = 0;
  }
});
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar" :class="{ 'is-open': menuOpen }">
      <div class="brand">
        <span class="brand-mark">S</span><strong>Sílabos UEB</strong>
      </div>
      <nav aria-label="Navegación principal">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          @click="menuOpen = false"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </aside>

    <div class="app-workspace">
      <header class="global-header">
        <button
          class="icon-button menu-button"
          type="button"
          aria-label="Abrir navegación"
          @click="menuOpen = !menuOpen"
        >
          ☰
        </button>
        <button class="scope-button" type="button" @click="scopeOpen = true">
          <span>{{ sessionState.current.value?.user.name }}</span
          ><small>{{ roleLabel }}</small>
        </button>
        <div class="global-actions">
          <RouterLink
            class="notification-link"
            to="/notificaciones"
            aria-label="Notificaciones"
          >
            Notificaciones <span v-if="unreadCount">{{ unreadCount }}</span>
          </RouterLink>
          <button
            class="icon-button"
            type="button"
            :aria-label="
              theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'
            "
            @click="toggleTheme"
          >
            {{ theme === "light" ? "◐" : "☀" }}
          </button>
        </div>
      </header>

      <div class="shell-content"><slot /></div>
    </div>

    <button
      v-if="menuOpen"
      class="shell-backdrop"
      type="button"
      aria-label="Cerrar navegación"
      @click="menuOpen = false"
    />
    <div
      v-if="scopeOpen"
      class="sheet-backdrop"
      @click.self="scopeOpen = false"
    >
      <aside
        class="scope-sheet"
        aria-modal="true"
        role="dialog"
        aria-labelledby="scope-title"
      >
        <header>
          <div>
            <h2 id="scope-title">Ámbito de trabajo</h2>
            <p>Seleccione el rol y la carrera activos.</p>
          </div>
          <button
            class="icon-button"
            type="button"
            aria-label="Cerrar"
            @click="scopeOpen = false"
          >
            ×
          </button>
        </header>
        <button
          v-for="role in sessionState.current.value?.available_roles"
          :key="role.id"
          class="scope-option"
          :class="{
            active: role.id === sessionState.current.value?.active_role?.id,
          }"
          type="button"
          @click="switchScope(role.id)"
        >
          <strong>{{ role.code }}</strong
          ><span>{{ role.career_name ?? "Ámbito institucional" }}</span>
        </button>
        <footer>
          <RouterLink to="/seguridad" @click="scopeOpen = false"
            >Seguridad</RouterLink
          ><button type="button" @click="closeSession">Cerrar sesión</button>
        </footer>
      </aside>
    </div>
  </div>
</template>
