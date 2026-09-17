import type { ComputedRef, DeepReadonly } from 'vue';
import { computed, readonly } from 'vue';
import { useRoute } from 'vue-router';
import { toUrl } from '@/lib/utils';
import type { NavigableHref } from '@/types';

export type UseCurrentUrlReturn = {
    currentUrl: DeepReadonly<ComputedRef<string>>;
    isCurrentUrl: (urlToCheck: NavigableHref, currentUrl?: string, startsWith?: boolean) => boolean;
    isCurrentOrParentUrl: (urlToCheck: NavigableHref, currentUrl?: string) => boolean;
    whenCurrentUrl: <T, F = null>(urlToCheck: NavigableHref, ifTrue: T, ifFalse?: F) => T | F;
};

export function useCurrentUrl(): UseCurrentUrlReturn {
    const route = useRoute();
    const currentUrl = computed(() => route.fullPath);

    const isCurrentUrl = (
        urlToCheck: NavigableHref,
        current = currentUrl.value,
        startsWith = false,
    ): boolean => {
        const raw = toUrl(urlToCheck);
        const target = raw.startsWith('http')
            ? `${new URL(raw).pathname}${new URL(raw).search}`
            : raw;
        const exact = target.includes('?') ? current === target : current.split('?')[0] === target;
        const targetPath = target.split('?')[0];
        const currentPath = current.split('?')[0];

        return exact || (startsWith && currentPath.startsWith(targetPath.endsWith('/') ? targetPath : `${targetPath}/`));
    };

    const isCurrentOrParentUrl = (urlToCheck: NavigableHref, current?: string): boolean =>
        isCurrentUrl(urlToCheck, current, true);

    const whenCurrentUrl = <T, F = null>(urlToCheck: NavigableHref, ifTrue: T, ifFalse?: F): T | F =>
        isCurrentUrl(urlToCheck) ? ifTrue : (ifFalse ?? null) as F;

    return { currentUrl: readonly(currentUrl), isCurrentUrl, isCurrentOrParentUrl, whenCurrentUrl };
}
