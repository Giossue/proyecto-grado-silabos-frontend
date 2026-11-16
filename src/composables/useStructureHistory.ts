import { computed, ref } from 'vue';

type StructureHistoryOptions<T> = {
    capture: () => T;
    restore: (state: T) => void;
    limit?: number;
    coalesceMs?: number;
};

export const useStructureHistory = <T>({ capture, restore, limit = 50, coalesceMs = 1000 }: StructureHistoryOptions<T>) => {
    const past = ref<string[]>([]);
    const future = ref<string[]>([]);
    let lastGroup: string | null = null;
    let lastAt = 0;

    const record = (group?: string): void => {
        const now = Date.now();
        if (group && group === lastGroup && now - lastAt < coalesceMs) {
            lastAt = now;
            return;
        }
        past.value.push(JSON.stringify(capture()));
        if (past.value.length > limit) past.value.shift();
        future.value = [];
        lastGroup = group ?? null;
        lastAt = now;
    };
    const step = (from: typeof past, to: typeof past): boolean => {
        const state = from.value.pop();
        if (state === undefined) return false;
        to.value.push(JSON.stringify(capture()));
        lastGroup = null;
        restore(JSON.parse(state) as T);
        return true;
    };
    const undo = (): boolean => step(past, future);
    const redo = (): boolean => step(future, past);
    const reset = (): void => {
        past.value = [];
        future.value = [];
        lastGroup = null;
    };

    return { record, undo, redo, reset, canUndo: computed(() => past.value.length > 0), canRedo: computed(() => future.value.length > 0) };
};
