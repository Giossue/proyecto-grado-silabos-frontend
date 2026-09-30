import { onScopeDispose, ref } from 'vue';

export const useDiscardConfirmation = () => {
    const open = ref(false);
    let pending: Promise<boolean> | null = null;
    let resolve: ((discard: boolean) => void) | null = null;

    const decide = (discard: boolean): void => {
        open.value = false;
        resolve?.(discard);
        resolve = null;
        pending = null;
    };

    const ask = (): Promise<boolean> => {
        if (pending) return pending;
        open.value = true;
        pending = new Promise<boolean>((complete) => { resolve = complete; });
        return pending;
    };

    onScopeDispose(() => decide(false));
    return { open, ask, decide };
};
