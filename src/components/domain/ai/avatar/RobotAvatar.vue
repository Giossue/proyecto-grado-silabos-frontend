<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
    EXPRESSIONS,
    headRadius,
    renderFrame,
    sample,
    startPlayback,
    withIntensity,
    type AnimationKey,
    type BlobFrame,
    type Expression,
    type PlaybackState,
} from './blobGeometry';
import { clampIntensity, type AvatarEmotion, type AvatarMode } from './types';

// Blob azul con dos ojos (estilo «Strobi»): la esfera gira y los ojos cambian de forma
// según la animación del modo o de la emoción vigente.
const props = withDefaults(defineProps<{
    mode?: AvatarMode;
    emotion?: AvatarEmotion;
    intensity?: number;
}>(), {
    mode: 'idle',
    emotion: 'neutral',
    intensity: 0.6,
});

const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const radius = headRadius();

const animation = computed<AnimationKey>(() => (props.emotion === 'neutral' ? props.mode : props.emotion));

const frame = ref<BlobFrame>(renderFrame(EXPRESSIONS.neutral));
let playback: PlaybackState | null = null;
let current: Expression = EXPRESSIONS.neutral;
let blinking = false;
let timer: number | null = null;

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const schedule = (callback: () => void): number =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(callback) : (setTimeout(callback, 16) as unknown as number);
const cancel = (handle: number): void => {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle);
};

const tick = (): void => {
    timer = null;
    if (!playback) return;
    const sampled = sample(playback, now());
    playback = sampled.state;
    current = sampled.expression;
    blinking = sampled.blink < 1;
    frame.value = renderFrame(withIntensity(current, clampIntensity(props.intensity)), sampled.blink);
    timer = schedule(tick);
};

const restart = (): void => {
    if (timer !== null) cancel(timer);
    timer = null;
    if (reducedMotion.value) {
        playback = null;
        current = EXPRESSIONS.neutral;
        frame.value = renderFrame(current);
        return;
    }
    // Arranca desde la expresión actual para no saltar de golpe.
    playback = startPlayback(animation.value, now(), current);
    tick();
};

watch([animation, reducedMotion], restart);
onMounted(restart);
onBeforeUnmount(() => {
    if (timer !== null) cancel(timer);
});
</script>

<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="-130 -130 260 260"
        fill="none"
        role="img"
        aria-hidden="true"
        class="robot-avatar"
        data-slot="robot-avatar"
        :data-mode="mode"
        :data-emotion="emotion"
        :data-animation="animation"
        :data-blinking="blinking || undefined"
    >
        <g id="robot_motion">
            <g id="robot_root">
                <g id="body">
                    <circle id="body_shell" cx="0" cy="0" :r="radius.toFixed(1)" fill="var(--avatar-body)" />
                </g>
                <g id="eyes">
                    <g id="eye_left">
                        <path v-if="frame.left.visible" id="eye_left_dot" :d="frame.left.path" fill="var(--avatar-outline)" />
                    </g>
                    <g id="eye_right">
                        <path v-if="frame.right.visible" id="eye_right_dot" :d="frame.right.path" fill="var(--avatar-outline)" />
                    </g>
                </g>
            </g>
        </g>
    </svg>
</template>

<style scoped>
.robot-avatar {
    overflow: visible;
}

#robot_root {
    transform-box: view-box;
    transform-origin: 0 0;
}

/* Las emociones fuertes añaden un pequeño salto o sobresalto del cuerpo entero. */
[data-emotion='happy'] #robot_root {
    animation: bounce 520ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

[data-emotion='surprised'] #robot_root {
    animation: startle 420ms ease-out;
}

@keyframes bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    70% {
        transform: translateY(2px);
    }
}

@keyframes startle {
    0% {
        transform: scale(1);
    }
    40% {
        transform: scale(1.06);
    }
    100% {
        transform: scale(1);
    }
}

@media (prefers-reduced-motion: reduce) {
    .robot-avatar * {
        animation: none !important;
    }
}
</style>
