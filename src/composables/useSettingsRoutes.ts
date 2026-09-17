import { computed } from 'vue';
import { paths } from '@/lib/routes';

export function useSettingsRoutes() {
    return {
        profile: computed(() => paths.configuration.profile),
        security: computed(() => paths.configuration.security),
        appearance: computed(() => paths.configuration.appearance),
    };
}
