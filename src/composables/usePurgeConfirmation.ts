import { readonly, ref } from 'vue';

export const FINALIZED_NOTICE = 'convocatoria_finalizada';

const open = ref(false);
const message = ref('');
const count = ref(0);
const mode = ref<string | null>(null);
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
    purgeMode?: string,
): void {
    onCancel?.();
    onCancel = cancelled ?? null;
    message.value = purgeMessage;
    count.value = purgeCount;
    mode.value = purgeMode ?? null;
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
        mode: readonly(mode),
        confirm,
        cancel,
    };
}
