/**
 * Contrato público del avatar del asistente. El resto de la aplicación solo
 * conoce estos tipos; la implementación (SVG hoy, Rive mañana) queda oculta.
 */
export type AvatarMode = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AvatarEmotion = 'neutral' | 'happy' | 'surprised' | 'confused';

export interface AvatarState {
    mode: AvatarMode;
    emotion: AvatarEmotion;
    intensity?: number;
}

/** Pista opcional que el agente puede incluir en su respuesta. */
export interface AgentAvatarHint {
    emotion?: AvatarEmotion | string | null;
    intensity?: number | null;
}

export const AVATAR_EMOTIONS: readonly AvatarEmotion[] = [
    'neutral',
    'happy',
    'surprised',
    'confused',
];

export const clampIntensity = (value: number | null | undefined, fallback = 0.6): number =>
    typeof value === 'number' && Number.isFinite(value)
        ? Math.min(1, Math.max(0, value))
        : fallback;
