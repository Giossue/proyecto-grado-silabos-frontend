import { computed, readonly, ref, watch } from 'vue';
import { getDashboard, type SetupChecklist } from '@/api/dashboard';
import { sessionState } from '@/state/session';

const FRESH_FOR_MS = 10_000;
/** Paso que es el botón de la pantalla de cada rol y no se lista en el checklist. */
const START_KEYS: Record<string, string> = { administrador: 'process', coordinador: 'convocation' };

const setup = ref<SetupChecklist | null>(null);
const loadedAt = ref(0);
/** Cada pedido abre el panel «Antes de empezar» (la franja del siguiente paso lo usa). */
const openRequests = ref(0);
const requestOpen = (): void => { openRequests.value += 1; };

const sessionKey = computed(() => {
    const session = sessionState.current.value;
    const code = session?.active_role?.code;

    return session?.active_role && code && START_KEYS[code] ? `${session.user?.id}:${session.active_role.id}` : null;
});
const startKey = computed(() => START_KEYS[sessionState.current.value?.active_role?.code ?? ''] ?? null);

const update = (checklist: SetupChecklist | null): void => {
    setup.value = checklist;
    loadedAt.value = Date.now();
};

const load = async (): Promise<void> => {
    const key = sessionKey.value;
    if (!key) return;
    try {
        const dashboard = await getDashboard();
        if (key === sessionKey.value) update(dashboard.setup);
    } catch {
        return;
    }
};

const refresh = async (): Promise<void> => {
    if (Date.now() - loadedAt.value >= FRESH_FOR_MS) await load();
};

watch(sessionKey, (key) => {
    setup.value = null;
    loadedAt.value = 0;
    if (key) void load();
}, { immediate: true });

export const setupChecklistState = { setup: readonly(setup), startKey, load, refresh, update, openRequests: readonly(openRequests), requestOpen };
