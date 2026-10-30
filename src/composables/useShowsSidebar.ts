import { computed, type ComputedRef } from 'vue';
import { sessionState } from '@/state/session';

export const ROLES_WITHOUT_SIDEBAR: readonly string[] = ['docente', 'bibliotecario'];

export function useShowsSidebar(): ComputedRef<boolean> {
    return computed(() => !ROLES_WITHOUT_SIDEBAR.includes(sessionState.current.value?.active_role?.code ?? ''));
}
