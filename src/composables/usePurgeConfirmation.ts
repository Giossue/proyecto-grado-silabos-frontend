import { readonly, ref } from 'vue';

const open = ref(false);
const message = ref('');
const count = ref(0);
let retry: (() => Promise<void> | void) | null = null;

/**
 * Los editores canónicos registraban la URL en el ciclo de Inertia. En la SPA el
 * cliente API conserva la confirmación junto a la propia promesa, por lo que solo se
 * mantiene este contrato de ciclo de vida para los componentes portados.
 */
export function registerLocalPurgeConfirmation(url: string): () => void {
    void url;
    return () => undefined;
}

/**
 * Registra una mutación API que el servidor exige confirmar antes de purgar trabajo en
 * curso. Sustituye exclusivamente la repetición automática que antes hacía Inertia.
 */
export function requestPurgeConfirmation(
    purgeMessage: string,
    purgeCount: number,
    confirmedRequest: () => Promise<void> | void,
): void {
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
        await operation?.();
    };

    const cancel = (): void => {
        open.value = false;
        retry = null;
    };

    return {
        open: readonly(open),
        message: readonly(message),
        count: readonly(count),
        confirm,
        cancel,
    };
}
