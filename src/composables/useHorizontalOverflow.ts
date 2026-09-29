import type { Ref } from 'vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';

export type UseHorizontalOverflowReturn = {
    canScrollLeft: Ref<boolean>;
    canScrollRight: Ref<boolean>;
    overflows: Ref<boolean>;
    measure: () => void;
};

export function useHorizontalOverflow(
    element: Ref<HTMLElement | null>,
): UseHorizontalOverflowReturn {
    const canScrollLeft = ref(false);
    const canScrollRight = ref(false);
    const overflows = ref(false);

    const EPSILON = 1;

    const measure = (): void => {
        const node = element.value;

        if (node === null) {
            return;
        }

        const maxScroll = node.scrollWidth - node.clientWidth;

        overflows.value = maxScroll > EPSILON;
        canScrollLeft.value = node.scrollLeft > EPSILON;
        canScrollRight.value = node.scrollLeft < maxScroll - EPSILON;
    };

    let observer: ResizeObserver | null = null;

    const observe = (node: HTMLElement): void => {
        node.addEventListener('scroll', measure, { passive: true });

        observer = new ResizeObserver(measure);
        observer.observe(node);

        for (const child of Array.from(node.children)) {
            observer.observe(child);
        }

        measure();
    };

    const unobserve = (node: HTMLElement): void => {
        node.removeEventListener('scroll', measure);
        observer?.disconnect();
        observer = null;
    };

    onMounted(() => {
        if (element.value !== null) {
            observe(element.value);
        }
    });

    watch(element, (node, previous) => {
        if (previous) {
            unobserve(previous);
        }

        if (node) {
            observe(node);
        }
    });

    onUnmounted(() => {
        if (element.value !== null) {
            unobserve(element.value);
        }
    });

    return { canScrollLeft, canScrollRight, overflows, measure };
}

