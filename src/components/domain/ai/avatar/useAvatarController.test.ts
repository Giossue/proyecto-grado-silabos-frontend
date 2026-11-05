import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvatarController } from './useAvatarController';

const setup = () => {
    const signals = { userEngaged: ref(false), awaitingModel: ref(false), receivedCount: ref(0) };
    let controller!: ReturnType<typeof useAvatarController>;
    mount(defineComponent({
        setup() {
            controller = useAvatarController(signals);
            return () => null;
        },
    }));
    return { signals, controller };
};

describe('useAvatarController', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('sigue el ciclo idle → listening → thinking → speaking → idle', async () => {
        const { signals, controller } = setup();
        expect(controller.state.value.mode).toBe('idle');

        signals.userEngaged.value = true;
        await nextTick();
        expect(controller.state.value.mode).toBe('listening');

        signals.awaitingModel.value = true;
        await nextTick();
        expect(controller.state.value.mode).toBe('thinking');

        signals.userEngaged.value = false;
        signals.awaitingModel.value = false;
        signals.receivedCount.value = 2;
        await nextTick();
        expect(controller.state.value.mode).toBe('speaking');

        vi.advanceTimersByTime(2000);
        expect(controller.state.value.mode).toBe('idle');
    });

    it('no habla al cargar historial sin solicitud pendiente', async () => {
        const { signals, controller } = setup();
        signals.receivedCount.value = 3;
        await nextTick();
        expect(controller.state.value.mode).toBe('idle');
    });
});
