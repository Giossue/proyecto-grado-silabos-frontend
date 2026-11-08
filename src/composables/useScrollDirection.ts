import type { Ref } from 'vue';
import { onMounted, onUnmounted, ref } from 'vue';

export type UseScrollDirectionOptions = {
    threshold?: number;
    topOffset?: number;
};

export type UseScrollDirectionReturn = {
    hidden: Ref<boolean>;
};

export function useScrollDirection(
    options: UseScrollDirectionOptions = {},
): UseScrollDirectionReturn {
    const { threshold = 12, topOffset = 80 } = options;
    const hidden = ref(false);

    let lastY = 0;
    let ticking = false;
    let scroller: HTMLElement | null = null;

    // En móvil hace scroll el documento; en escritorio, el área de la app.
    const currentY = (): number => Math.max(0, scroller?.scrollTop ?? 0, window.scrollY);

    const evaluate = (): void => {
        const y = currentY();

        if (y <= topOffset) {
            hidden.value = false;
            lastY = y;
            ticking = false;

            return;
        }

        const delta = y - lastY;

        if (Math.abs(delta) >= threshold) {
            hidden.value = delta > 0;
            lastY = y;
        }

        ticking = false;
    };

    const onScroll = (): void => {
        if (ticking) {
            return;
        }

        ticking = true;
        window.requestAnimationFrame(evaluate);
    };

    onMounted(() => {
        scroller = document.querySelector<HTMLElement>(
            '[data-app-scroll] > [data-slot="scroll-area-viewport"]',
        );
        lastY = currentY();
        scroller?.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
    });

    onUnmounted(() => {
        scroller?.removeEventListener('scroll', onScroll);
        window.removeEventListener('scroll', onScroll);
    });

    return { hidden };
}

