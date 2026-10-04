<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { clampIntensity, type AvatarEmotion, type AvatarMode } from './types';

// Blob azul con dos ojos, al estilo «Strobi»: casi todo se expresa con los ojos y el cuerpo;
// la boca solo aparece al hablar, sonreír o sorprenderse.
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
const blinking = ref(false);
let blinkTimer: ReturnType<typeof setTimeout> | null = null;

type Mouth = 'smile' | 'neutral' | 'talk' | 'surprised';

const mouth = computed<Mouth>(() => {
    if (props.mode === 'speaking') return 'talk';
    if (props.emotion === 'surprised') return 'surprised';
    if (props.emotion === 'happy') return 'smile';
    return 'neutral';
});

const style = computed(() => ({
    '--avatar-intensity': String(clampIntensity(props.intensity)),
}));

const blinks = computed(() =>
    !reducedMotion.value && props.emotion !== 'surprised',
);

const scheduleBlink = (): void => {
    if (blinkTimer) clearTimeout(blinkTimer);
    if (!blinks.value) return;
    blinkTimer = setTimeout(() => {
        blinking.value = true;
        blinkTimer = setTimeout(() => {
            blinking.value = false;
            scheduleBlink();
        }, 170);
    }, 1800 + Math.random() * 2600);
};

watch(blinks, scheduleBlink);
onMounted(scheduleBlink);
onBeforeUnmount(() => {
    if (blinkTimer) clearTimeout(blinkTimer);
});
</script>

<template>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 326 272"
        fill="none"
        role="img"
        aria-hidden="true"
        class="robot-avatar"
        data-slot="robot-avatar"
        :data-mode="mode"
        :data-emotion="emotion"
        :data-mouth="mouth"
        :data-blinking="blinking || undefined"
        :style="style"
    >
        <g id="robot_motion">
            <g id="robot_root">
                <g id="body">
                    <!-- Círculo con un leve aplastamiento lateral para que no parezca geométrico. -->
                    <path
                        id="body_shell"
                        d="M163 18c66 0 119 51 119 118 0 69-50 118-119 118S44 205 44 136C44 69 97 18 163 18Z"
                        fill="var(--avatar-body)"
                    />
                </g>

                <g id="eyes">
                    <g id="eye_left">
                        <rect id="eye_left_dot" x="107" y="104" width="30" height="62" rx="15" fill="var(--avatar-outline)" />
                    </g>
                    <g id="eye_right">
                        <rect id="eye_right_dot" x="189" y="104" width="30" height="62" rx="15" fill="var(--avatar-outline)" />
                    </g>
                </g>

                <g id="mouth">
                    <path id="mouth_smile" d="M139 190c8 11 40 11 48 0" stroke="var(--avatar-outline)" stroke-width="7" stroke-linecap="round" />
                    <ellipse id="mouth_talk_small" cx="163" cy="196" rx="9" ry="6" fill="var(--avatar-outline)" />
                    <ellipse id="mouth_talk_open" cx="163" cy="198" rx="12" ry="14" fill="var(--avatar-outline)" />
                    <circle id="mouth_surprised" cx="163" cy="198" r="10" fill="var(--avatar-outline)" />
                </g>
            </g>
        </g>
    </svg>
</template>

<style scoped>
.robot-avatar {
    --i: var(--avatar-intensity, 0.6);
    overflow: visible;
}

.robot-avatar g,
.robot-avatar path,
.robot-avatar rect {
    transform-box: view-box;
}

#robot_motion,
#robot_root,
#body_shell {
    transform-origin: 163px 254px;
}

#eyes {
    transform-origin: 163px 135px;
    transition: transform 320ms ease-out;
}

#eye_left,
#eye_left_dot {
    transform-origin: 122px 135px;
    transition: transform 240ms ease-out;
}

#eye_right,
#eye_right_dot {
    transform-origin: 204px 135px;
    transition: transform 240ms ease-out;
}

#mouth > * {
    opacity: 0;
    transition: opacity 140ms ease-out;
}

[data-mouth='smile'] #mouth_smile,
[data-mouth='surprised'] #mouth_surprised {
    opacity: 1;
}

[data-mouth='talk'] #mouth_talk_small {
    animation: talk-small 360ms steps(1, end) infinite;
}

[data-mouth='talk'] #mouth_talk_open {
    animation: talk-open 360ms steps(1, end) infinite;
}

[data-blinking] #eye_left,
[data-blinking] #eye_right {
    animation: blink 170ms ease-in-out;
}

/* En reposo respira: se aplasta y estira apenas, como gelatina. */
[data-mode='idle'] #body_shell {
    animation: breathe 4.2s ease-in-out infinite;
}

[data-mode='listening'] #robot_root {
    transform: rotate(calc(3deg * var(--i) + 1deg));
    transition: transform 400ms ease-out;
}

[data-mode='listening'] #eyes {
    transform: translateY(calc(-2px - 2px * var(--i))) scaleY(1.06);
}

[data-mode='thinking'] #robot_root {
    transform: rotate(-3deg);
    transition: transform 450ms ease-out;
}

[data-mode='thinking'] #eyes {
    transform: translate(calc(8px + 4px * var(--i)), calc(-10px - 4px * var(--i)));
}

[data-mode='thinking'] #eye_left_dot,
[data-mode='thinking'] #eye_right_dot {
    transform: scaleY(0.8);
}

[data-mode='speaking'] #robot_root {
    animation: speak-bob 720ms ease-in-out infinite;
}

[data-emotion='happy'] #robot_motion {
    animation: bounce 520ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

/* Ojos felices: se cierran en arco subiendo. */
[data-emotion='happy'] #eye_left_dot,
[data-emotion='happy'] #eye_right_dot {
    transform: translateY(-6px) scaleY(calc(0.45 - 0.1 * var(--i)));
}

[data-emotion='surprised'] #eyes {
    transform: translateY(-4px) scale(calc(1.12 + 0.12 * var(--i)));
}

[data-emotion='surprised'] #body_shell {
    animation: startle 420ms ease-out;
}

/* Confundido: un ojo entrecerrado y la mirada ladeada. */
[data-emotion='confused'] #eyes {
    transform: translateX(-6px);
}

[data-emotion='confused'] #eye_right_dot {
    transform: scaleY(0.6) translateY(8px);
}

@keyframes blink {
    0%,
    100% {
        transform: scaleY(1);
    }
    50% {
        transform: scaleY(0.08);
    }
}

@keyframes breathe {
    0%,
    100% {
        transform: scale(1, 1);
    }
    50% {
        transform: scale(calc(1 + 0.012 * var(--i)), calc(1 - 0.018 * var(--i)));
    }
}

@keyframes speak-bob {
    0%,
    100% {
        transform: translateY(0) scale(1, 1);
    }
    50% {
        transform: translateY(calc(-1px - 1px * var(--i))) scale(1.01, 0.99);
    }
}

@keyframes startle {
    0% {
        transform: scale(1, 1);
    }
    40% {
        transform: scale(calc(1.04 + 0.04 * var(--i)), calc(1.06 + 0.04 * var(--i)));
    }
    100% {
        transform: scale(1, 1);
    }
}

@keyframes bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(calc(-5px - 6px * var(--i)));
    }
    70% {
        transform: translateY(2px);
    }
}

@keyframes talk-small {
    0% {
        opacity: 1;
    }
    50% {
        opacity: 0;
    }
}

@keyframes talk-open {
    0% {
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
}

@media (prefers-reduced-motion: reduce) {
    .robot-avatar *,
    .robot-avatar *::before {
        animation: none !important;
        transition: none !important;
    }

    [data-mode] #robot_root {
        transform: none;
    }

    [data-mouth='talk'] #mouth_talk_small {
        opacity: 1;
    }
}
</style>
