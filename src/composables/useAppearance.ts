import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, ref } from 'vue';
import type { Appearance, ResolvedAppearance } from '@/types';

export type { Appearance, ResolvedAppearance };

export type UseAppearanceReturn = {
    appearance: Ref<Appearance>;
    resolvedAppearance: ComputedRef<ResolvedAppearance>;
    updateAppearance: (value: Appearance) => void;
};

export const DEFAULT_APPEARANCE: Appearance = 'light';

const isAppearance = (value: unknown): value is Appearance =>
    value === 'light' || value === 'dark';

export function updateTheme(value: Appearance): void {
    if (typeof window === 'undefined') {
        return;
    }

    document.documentElement.classList.toggle('dark', value === 'dark');
}

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;

    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return DEFAULT_APPEARANCE;
    }

    const stored = localStorage.getItem('appearance');

    return isAppearance(stored) ? stored : DEFAULT_APPEARANCE;
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    updateTheme(getStoredAppearance());
}

const appearance = ref<Appearance>(DEFAULT_APPEARANCE);

export function useAppearance(): UseAppearanceReturn {
    onMounted(() => {
        appearance.value = getStoredAppearance();
    });

    const resolvedAppearance = computed<ResolvedAppearance>(
        () => appearance.value,
    );

    function updateAppearance(value: Appearance) {
        appearance.value = value;

        localStorage.setItem('appearance', value);

        setCookie('appearance', value);

        updateTheme(value);
    }

    return {
        appearance,
        resolvedAppearance,
        updateAppearance,
    };
}

