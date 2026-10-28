import { nextTick } from 'vue';
import type { Router } from 'vue-router';

export const APP_NAME = 'Sílabos UEB';
export const CONTENT_ID = 'contenido';

export const focusContent = (): void => {
    document.getElementById(CONTENT_ID)?.focus({ preventScroll: true });
};

/** La pestaña solo dice el rol del área, sin el nombre de cada pantalla. */
const AREA_TITLES: Record<string, string> = { admin: 'Admin', coordinacion: 'Coordinador', docente: 'Docente', biblioteca: 'Biblioteca' };

export const tabTitle = (path: string): string => {
    const area = AREA_TITLES[path.split('/')[1] ?? ''];
    return area ? `${area} · ${APP_NAME}` : APP_NAME;
};

export function installPageAnnouncements(router: Router): void {
    router.afterEach((to, from) => {
        document.title = tabTitle(to.path);
        if (from.matched.length === 0 || to.path === from.path) return;
        void nextTick(focusContent);
    });
}
