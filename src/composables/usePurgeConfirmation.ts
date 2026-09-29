import { readonly, ref } from 'vue';

const open = ref(false);
const message = ref('');
const count = ref(0);
let retry: (() => Promise<void> | void) | null = null;
let onCancel: (() => void) | null = null;

export function registerLocalPurgeConfirmation(url: string): () => void {
    void url;
    return () => undefined;
}

export function requestPurgeConfirmation(
    purgeMessage: string,
    purgeCount: number,
    confirmedRequest: () => Promise<void> | void,
    cancelled?: () => void,
): void {
    onCancel?.();
    onCancel = cancelled ?? null;
    message.value = purgeMessage;
    count.value = purgeCount;
    retry = confirmedRequest;
    open.value = true;
}

export function usePurgeConfirmation() {
    const confirm = async (): Promise<void> => {
        const operation = retry;
        open.value = false;
        retry = null;
        onCancel = null;
        await operation?.();
    };

    const cancel = (): void => {
        const cancelled = onCancel;
        open.value = false;
        retry = null;
        onCancel = null;
        cancelled?.();
    };

    return {
        open: readonly(open),
        message: readonly(message),
        count: readonly(count),
        confirm,
        cancel,
    };
}
