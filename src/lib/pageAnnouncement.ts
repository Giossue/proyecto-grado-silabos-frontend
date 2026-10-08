import { nextTick } from 'vue';
import type { Router } from 'vue-router';

export const APP_NAME = 'Sílabos UEB';
export const CONTENT_ID = 'contenido';

export const focusContent = (): void => {
    document.getElementById(CONTENT_ID)?.focus({ preventScroll: true });
};

export function installPageAnnouncements(router: Router): void {
    router.afterEach((to, from) => {
        const title = typeof to.meta.title === 'string' && to.meta.title !== '' ? to.meta.title : null;
        document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
        if (from.matched.length === 0 || to.path === from.path) return;
        void nextTick(focusContent);
    });
}
