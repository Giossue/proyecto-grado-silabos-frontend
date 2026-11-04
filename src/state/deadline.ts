import { computed, readonly, ref, watch } from 'vue';
import { getDeadline, type DashboardDeadline } from '@/api/dashboard';
import { sessionState } from '@/state/session';

const FRESH_FOR_MS = 60_000;
// Administración solo recibe aviso con la convocatoria en pausa o finalizada (el servidor no le manda plazo en otro caso).
const ROLES_WITH_DEADLINE = ['docente', 'coordinador', 'bibliotecario', 'administrador'] as const;

type Audience = (typeof ROLES_WITH_DEADLINE)[number];

const deadline = ref<DashboardDeadline | null>(null);
const loadedAt = ref(0);

const audience = computed((): Audience | null => {
    const code = sessionState.current.value?.active_role?.code;

    return ROLES_WITH_DEADLINE.find((role) => role === code) ?? null;
});

const sessionKey = computed(() => {
    const session = sessionState.current.value;

    return session?.active_role && audience.value ? `${session.user.id}:${session.active_role.id}` : null;
});

const load = async (): Promise<void> => {
    const key = sessionKey.value;
    if (!key) return;
    try {
        const result = await getDeadline();
        if (key !== sessionKey.value) return;
        deadline.value = result.deadline;
        loadedAt.value = Date.now();
    } catch {
        return;
    }
};

const refresh = async (): Promise<void> => {
    if (Date.now() - loadedAt.value >= FRESH_FOR_MS) await load();
};

watch(sessionKey, (key) => {
    deadline.value = null;
    loadedAt.value = 0;
    if (key) void load();
}, { immediate: true });

export const deadlineState = {
    deadline: readonly(deadline),
    audience,
    load,
    refresh,
};
