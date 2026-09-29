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

    const evaluate = (): void => {
        const y = Math.max(0, window.scrollY);

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
        lastY = Math.max(0, window.scrollY);
        window.addEventListener('scroll', onScroll, { passive: true });
    });

    onUnmounted(() => {
        window.removeEventListener('scroll', onScroll);
    });

    return { hidden };
}

