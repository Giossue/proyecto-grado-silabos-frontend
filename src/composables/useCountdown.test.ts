import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useCountdown } from '@/composables/useCountdown';

describe('useCountdown', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('cuenta los segundos cada vez que se activa y llega a cero', async () => {
        const active = ref(false);
        let remaining = ref(0);
        mount(defineComponent({
            setup() {
                remaining = useCountdown(active, 3);
                return () => null;
            },
        }));

        expect(remaining.value).toBe(0);
        active.value = true;
        await nextTick();
        expect(remaining.value).toBe(3);
        vi.advanceTimersByTime(2000);
        expect(remaining.value).toBe(1);
        vi.advanceTimersByTime(5000);
        expect(remaining.value).toBe(0);

        active.value = false;
        await nextTick();
        active.value = true;
        await nextTick();
        expect(remaining.value).toBe(3);
    });
});
