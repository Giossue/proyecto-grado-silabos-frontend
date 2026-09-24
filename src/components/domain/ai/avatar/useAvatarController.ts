import { onBeforeUnmount, readonly, ref, watch, type Ref } from 'vue';
import {
    AVATAR_EMOTIONS,
    clampIntensity,
    type AgentAvatarHint,
    type AvatarEmotion,
    type AvatarMode,
    type AvatarState,
} from './types';

/** Señales reales del ciclo del chat; el controlador decide el modo. */
export interface ChatLifecycleSignals {
    /** El usuario interactúa con el asistente (escribe, habla o lo enfoca). */
    userEngaged: Ref<boolean>;
    /** Se envió la solicitud y se espera al modelo. */
    awaitingModel: Ref<boolean>;
    /** Cantidad de fragmentos/resultados recibidos del modelo. */
    receivedCount: Ref<number>;
}

const SPEAKING_MS = 1800;
const EMOTION_HOLD_MS = 6000;

/**
 * Controlador central del avatar. Nadie fuera de aquí manipula partes del SVG:
 * la app entrega señales del ciclo y pistas del agente, y recibe un AvatarState.
 */
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

    /** Aplica la emoción que declara el agente; nunca se infiere del texto. */
    const applyAgentHint = (hint: AgentAvatarHint | null | undefined): void => {
        const emotion = hint?.emotion;
        if (!emotion || !AVATAR_EMOTIONS.includes(emotion as AvatarEmotion)) return;
        setEmotion(emotion as AvatarEmotion, hint?.intensity ?? undefined);
    };

    // Solo habla cuando llega respuesta a una solicitud real, no al cargar historial.
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

    return { state: readonly(state), applyAgentHint, setEmotion };
}
