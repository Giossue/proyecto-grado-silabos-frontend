import { onBeforeUnmount, readonly, ref, watch, type Ref } from 'vue';
import {
    clampIntensity,
    type AvatarEmotion,
    type AvatarMode,
    type AvatarState,
} from './types';

export interface ChatLifecycleSignals {
    userEngaged: Ref<boolean>;
    awaitingModel: Ref<boolean>;
    receivedCount: Ref<number>;
}

const SPEAKING_MS = 1800;
const EMOTION_HOLD_MS = 6000;

export function useAvatarController(signals: ChatLifecycleSignals) {
    const state = ref<AvatarState>({ mode: 'idle', emotion: 'neutral', intensity: 0.6 });
    let speakingTimer: ReturnType<typeof setTimeout> | null = null;
    let emotionTimer: ReturnType<typeof setTimeout> | null = null;

    const baseMode = (): AvatarMode => {
        if (signals.awaitingModel.value) return 'thinking';
        if (signals.userEngaged.value) return 'listening';
        return 'idle';
    };

    const settle = (): void => {
        if (speakingTimer) return;
        state.value = { ...state.value, mode: baseMode() };
    };

    const speak = (): void => {
        if (speakingTimer) clearTimeout(speakingTimer);
        state.value = { ...state.value, mode: 'speaking' };
        speakingTimer = setTimeout(() => {
            speakingTimer = null;
            settle();
        }, SPEAKING_MS);
    };

    const setEmotion = (emotion: AvatarEmotion, intensity?: number): void => {
        if (emotionTimer) clearTimeout(emotionTimer);
        state.value = {
            ...state.value,
            emotion,
            intensity: clampIntensity(intensity, state.value.intensity),
        };
        if (emotion !== 'neutral') {
            emotionTimer = setTimeout(() => setEmotion('neutral'), EMOTION_HOLD_MS);
        }
    };

    watch(signals.awaitingModel, (awaiting, wasAwaiting) => {
        if (awaiting) {
            setEmotion('neutral');
            settle();
        } else if (wasAwaiting) {
            speak();
        }
    });
    watch(signals.userEngaged, settle);
    watch(signals.receivedCount, (count, previous) => {
        if (count > previous && signals.awaitingModel.value) speak();
    });

    onBeforeUnmount(() => {
        if (speakingTimer) clearTimeout(speakingTimer);
        if (emotionTimer) clearTimeout(emotionTimer);
    });

    settle();

    return { state: readonly(state), setEmotion };
}
