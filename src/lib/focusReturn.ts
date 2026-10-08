import { watch } from 'vue';
import { focusContent } from '@/lib/pageAnnouncement';

const menuTrigger = '[aria-haspopup="menu"][aria-expanded="true"]';

export const captureFocusOrigin = (): HTMLElement | null => {
    const trigger = document.querySelector<HTMLElement>(menuTrigger);
    if (trigger) return trigger;
    const active = document.activeElement;

    return active instanceof HTMLElement && active !== document.body ? active : null;
};

export const restoreFocus = (origin: HTMLElement | null): void => {
    window.setTimeout(() => {
        if (origin?.isConnected) origin.focus();
        else focusContent();
    }, 0);
};

export function useFocusReturn(isOpen: () => boolean): void {
    let origin: HTMLElement | null = null;
    watch(isOpen, (open) => {
        if (open) origin = captureFocusOrigin();
        else restoreFocus(origin);
    }, { flush: 'sync' });
}
