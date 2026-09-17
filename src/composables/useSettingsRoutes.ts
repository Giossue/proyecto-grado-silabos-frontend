import { computed } from 'vue';

export function useSettingsRoutes() {
    return {
        profile: computed(() => '/configuracion/perfil'),
        security: computed(() => '/configuracion/seguridad'),
        appearance: computed(() => '/configuracion/apariencia'),
    };
}
