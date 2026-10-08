import { computed, readonly, ref, watch } from 'vue';
import { listAvailableScreenHelp, type ScreenHelp } from '@/api/screen-help';
import { sessionState } from '@/state/session';

const STORAGE_KEY = 'silabos:ayudas';

type Cache = { key: string; items: ScreenHelp[] };

const readCache = (): Cache | null => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Cache | null;

        return saved && typeof saved.key === 'string' && Array.isArray(saved.items) ? saved : null;
    } catch {
        return null;
    }
};

const cache = ref<Cache | null>(readCache());

const sessionKey = computed(() => {
    const session = sessionState.current.value;

    return session?.active_role ? `${session.user.id}:${session.active_role.code}` : null;
});

const items = computed(() => (cache.value && cache.value.key === sessionKey.value ? cache.value.items : []));

const load = async (): Promise<void> => {
    const key = sessionKey.value;
    if (!key) return;
    try {
        const result = await listAvailableScreenHelp();
        if (key !== sessionKey.value) return;
        cache.value = { key, items: result.help };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache.value)); } catch { return; }
    } catch {
        return;
    }
};

watch(sessionKey, (key, previous) => {
    if (key) {
        void load();
    } else if (previous) {
        cache.value = null;
        try { localStorage.removeItem(STORAGE_KEY); } catch { return; }
    }
}, { immediate: true });

export const screenHelpState = {
    items: readonly(items),
    forScreen: (screen: string): ScreenHelp | null => items.value.find((help) => help.screen === screen) ?? null,
    load,
};
