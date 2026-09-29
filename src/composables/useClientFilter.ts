import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';
import { computed, ref, toValue } from 'vue';

export type SearchableFields<T> = (item: T) => (string | null | undefined)[];

export type ClientFilterDefinition<T> = {
    initial?: string;
    matches: (item: T, value: string) => boolean;
};

export type UseClientFilterReturn<T> = {
    search: Ref<string>;
    values: Record<string, Ref<string>>;
    items: ComputedRef<T[]>;
    active: ComputedRef<boolean>;
    clear: () => void;
};

const normalize = (value: string): string =>
    value
        .toLocaleLowerCase('es')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

export function useClientFilter<T>(
    source: MaybeRefOrGetter<T[]>,
    searchable: SearchableFields<T>,
    filters: Record<string, ClientFilterDefinition<T>> = {},
): UseClientFilterReturn<T> {
    const search = ref('');
    const values: Record<string, Ref<string>> = {};

    for (const [key, definition] of Object.entries(filters)) {
        values[key] = ref(definition.initial ?? 'all');
    }

    const items = computed(() => {
        const term = normalize(search.value.trim());

        return toValue(source).filter((item) => {
            if (term !== '') {
                const haystack = searchable(item)
                    .filter((value): value is string => Boolean(value))
                    .map(normalize)
                    .join(' ');

                if (!haystack.includes(term)) {
                    return false;
                }
            }

            for (const [key, definition] of Object.entries(filters)) {
                const value = values[key].value;

                if (value !== 'all' && !definition.matches(item, value)) {
                    return false;
                }
            }

            return true;
        });
    });

    const active = computed(
        () =>
            search.value.trim() !== '' ||
            Object.values(values).some((value) => value.value !== 'all'),
    );

    const clear = (): void => {
        search.value = '';

        for (const value of Object.values(values)) {
            value.value = 'all';
        }
    };

    return { search, values, items, active, clear };
}

