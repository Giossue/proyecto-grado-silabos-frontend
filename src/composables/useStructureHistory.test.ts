import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStructureHistory } from '@/composables/useStructureHistory';

const setup = (limit?: number) => {
    let state = { value: 0 };
    const history = useStructureHistory({ capture: () => state, restore: (next) => { state = next; }, limit });
    const change = (value: number, group?: string) => { history.record(group); state = { value }; };
    return { history, change, current: () => state.value };
};

describe('useStructureHistory', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('deshace y rehace en orden y un cambio nuevo borra lo que se podía rehacer', () => {
        const { history, change, current } = setup();
        change(1);
        change(2);
        expect(history.undo()).toBe(true);
        expect(current()).toBe(1);
        expect(history.redo()).toBe(true);
        expect(current()).toBe(2);
        history.undo();
        change(5);
        expect(history.canRedo.value).toBe(false);
        expect(history.redo()).toBe(false);
    });

    it('junta los cambios seguidos del mismo grupo y los separa al pasar el tiempo', () => {
        const { history, change, current } = setup();
        change(1, 'titulo');
        vi.advanceTimersByTime(300);
        change(2, 'titulo');
        vi.advanceTimersByTime(3000);
        change(3, 'titulo');
        history.undo();
        expect(current()).toBe(2);
        history.undo();
        expect(current()).toBe(0);
        expect(history.canUndo.value).toBe(false);
    });

    it('guarda como máximo el límite de pasos', () => {
        const { history, change } = setup(3);
        for (let value = 1; value <= 6; value += 1) change(value);
        let steps = 0;
        while (history.undo()) steps += 1;
        expect(steps).toBe(3);
    });

    it('reset deja el historial vacío', () => {
        const { history, change } = setup();
        change(1);
        history.reset();
        expect(history.canUndo.value).toBe(false);
    });
});
