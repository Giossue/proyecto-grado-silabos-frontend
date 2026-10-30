import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

export const CONFIRMATION_SECONDS = 5;

export function useCountdown(active: Readonly<Ref<boolean>>, seconds = CONFIRMATION_SECONDS) {
    const remaining = ref(0);
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = (): void => {
        if (timer !== null) clearInterval(timer);
        timer = null;
    };

    watch(active, (isActive) => {
        stop();
        remaining.value = isActive ? seconds : 0;
        if (!isActive) return;
        timer = setInterval(() => {
            remaining.value = Math.max(0, remaining.value - 1);
            if (remaining.value === 0) stop();
        }, 1000);
    }, { immediate: true });

    onBeforeUnmount(stop);

    return remaining;
}
