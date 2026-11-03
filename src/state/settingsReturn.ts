import { ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';
import { paths, routeRegistry } from '@/lib/routes';

const settingsPaths = new Set([
  ...routeRegistry.filter((route) => route.shortcut === 'profile' || route.shortcut === 'security').map((route) => route.path),
  paths.admin.system,
  paths.coordination.emailNotices,
  paths.teacher.emailNotices,
  paths.library.emailNotices,
]);

/** Pantalla en la que estaba la persona antes de entrar a Configuración (Perfil y Seguridad cuentan como una sola). */
export const settingsReturn = ref<string | null>(null);

export const trackSettingsReturn = (to: RouteLocationNormalized, from: RouteLocationNormalized): void => {
  if (settingsPaths.has(to.path) && !settingsPaths.has(from.path) && from.matched.length > 0) settingsReturn.value = from.fullPath;
};
