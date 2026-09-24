<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { clampIntensity, type AvatarEmotion, type AvatarMode } from './types';

/**
 * Avatar SVG del asistente. El SVG va inline para animar sus grupos por ID;
 * el diseño y los colores son los de robot_icon_rive_ready.svg sin cambios.
 * Solo se añade el grupo envolvente `robot_motion` para los rebotes únicos.
 */
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
    if (props.emotion === 'confused' || props.mode === 'thinking') return 'neutral';
    return 'smile';
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
        }, 190);
    }, 1600 + Math.random() * 2200);
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
                <g id="ears">
                    <g id="ear_left">
                        <path id="ear_left_back" d="M18 166C8.06 166 0 174.06 0 184v10c0 9.94 8.06 18 18 18h2v-46h-2Z" fill="#114E7E" />
                        <rect id="ear_left_main" x="18" y="152" width="30" height="78" rx="12" fill="#1565A4" />
                    </g>
                    <g id="ear_right">
                        <path id="ear_right_back" d="M308 166c9.94 0 18 8.06 18 18v10c0 9.94-8.06 18-18 18h-2v-46h2Z" fill="#114E7E" />
                        <rect id="ear_right_main" x="278" y="152" width="30" height="78" rx="12" fill="#1565A4" />
                    </g>
                </g>

                <g id="head">
                    <rect id="head_shell" x="40" y="88" width="250" height="184" rx="29" fill="#D9D9D9" />
                    <rect id="face_panel" x="70" y="118" width="188" height="126" rx="49" fill="#000000" />
                </g>

                <g id="eyes">
                    <g id="eye_left">
                        <circle id="eye_left_dot" cx="113" cy="175" r="15" fill="#2F87CC" />
                    </g>
                    <g id="eye_right">
                        <circle id="eye_right_dot" cx="217" cy="175" r="15" fill="#2F87CC" />
                    </g>
                </g>

                <g id="mouth">
                    <path id="mouth_smile" d="M136 199h56c0 13.255-12.536 24-28 24s-28-10.745-28-24Z" fill="#2F87CC" />
                    <rect id="mouth_neutral" x="145" y="207" width="38" height="7" rx="3.5" fill="#2F87CC" />
                    <ellipse id="mouth_talk_small" cx="164" cy="211" rx="14" ry="9" fill="#2F87CC" />
                    <ellipse id="mouth_talk_open" cx="164" cy="211" rx="17" ry="20" fill="#2F87CC" />
                    <circle id="mouth_surprised" cx="164" cy="211" r="12" fill="#2F87CC" />
                </g>

                <g id="antenna">
                    <ellipse id="antenna_base" cx="169" cy="100" rx="25" ry="6" fill="#000000" />
                    <path id="antenna_stem" d="M167 100V78L148 67l19-11V35" stroke="#1565A4" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
                    <circle id="antenna_light" cx="168" cy="18" r="18" fill="#952222" />
                </g>
            </g>
        </g>
    </svg>
</template>

<style scoped>
/*
 * Todas las transformaciones usan el sistema de coordenadas del viewBox para
 * que los orígenes coincidan con las piezas del diseño original.
 */
.robot-avatar {
    --i: var(--avatar-intensity, 0.6);
    overflow: visible;
}

.robot-avatar g {
    transform-box: view-box;
}

#robot_motion,
#robot_root {
    transform-origin: 165px 272px;
}

#eyes {
    transform-origin: 165px 175px;
    transition: transform 320ms ease-out;
}

#eye_left {
    transform-origin: 113px 175px;
}

#eye_right {
    transform-origin: 217px 175px;
}

#antenna,
#antenna_stem,
#antenna_light {
    transform-origin: 168px 100px;
    transform-box: view-box;
}

/* Bocas: solo una visible a la vez */
#mouth > * {
    opacity: 0;
    transition: opacity 140ms ease-out;
}

[data-mouth='smile'] #mouth_smile,
[data-mouth='neutral'] #mouth_neutral,
[data-mouth='surprised'] #mouth_surprised {
    opacity: 1;
}

[data-mouth='talk'] #mouth_talk_small {
    animation: talk-small 360ms steps(1, end) infinite;
}

[data-mouth='talk'] #mouth_talk_open {
    animation: talk-open 360ms steps(1, end) infinite;
}

/* Parpadeo: scaleY 1 → 0.08 → 1 en ~190 ms */
[data-blinking] #eye_left,
[data-blinking] #eye_right {
    animation: blink 190ms ease-in-out;
}

/* Modos */
[data-mode='idle'] #robot_root {
    animation: idle-float 4s ease-in-out infinite;
}

[data-mode='listening'] #robot_root {
    transform: rotate(calc(1.5deg * var(--i) + 0.5deg));
    transition: transform 400ms ease-out;
}

[data-mode='listening'] #antenna {
    animation: antenna-sway 2.6s ease-in-out infinite;
    --sway: 1.5deg;
}

[data-mode='thinking'] #robot_root {
    transform: rotate(-2.5deg);
    transition: transform 450ms ease-out;
}

[data-mode='thinking'] #eyes {
    transform: translate(calc(5px + 3px * var(--i)), calc(-4px - 2px * var(--i)));
}

[data-mode='thinking'] #antenna {
    animation: antenna-sway 2.4s ease-in-out infinite;
    --sway: 5deg;
}

[data-mode='speaking'] #robot_root {
    animation: speak-nod 720ms ease-in-out infinite;
}

/* Emociones */
[data-emotion='happy'] #robot_motion {
    animation: bounce 520ms cubic-bezier(0.3, 0.7, 0.4, 1);
}

[data-emotion='happy'] #eyes {
    transform: scaleY(calc(1 - 0.2 * var(--i)));
}

[data-emotion='surprised'] #eyes {
    transform: scale(calc(1 + 0.15 * var(--i)));
}

[data-emotion='surprised'] #antenna_stem,
[data-emotion='surprised'] #antenna_light {
    animation: antenna-rebound 560ms ease-out;
}

[data-emotion='confused'] #eyes {
    transform: translateX(-4px);
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

@keyframes idle-float {
    0%,
    100% {
        transform: translateY(0) rotate(0deg);
    }
    30% {
        transform: translateY(calc(-1px - 1px * var(--i))) rotate(calc(-1deg * var(--i)));
    }
    70% {
        transform: translateY(calc(-0.5px - 0.5px * var(--i))) rotate(calc(1deg * var(--i)));
    }
}

@keyframes speak-nod {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(calc(-0.6px - 0.6px * var(--i)));
    }
}

@keyframes antenna-sway {
    0%,
    100% {
        transform: rotate(calc(var(--sway) * -1 * var(--i)));
    }
    50% {
        transform: rotate(calc(var(--sway) * var(--i)));
    }
}

@keyframes antenna-rebound {
    0% {
        transform: scaleY(1);
    }
    35% {
        transform: scaleY(calc(1 + 0.1 * var(--i)));
    }
    65% {
        transform: scaleY(0.96);
    }
    100% {
        transform: scaleY(1);
    }
}

@keyframes bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(calc(-3px - 4px * var(--i)));
    }
    70% {
        transform: translateY(1px);
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

/* Movimiento reducido: sin movimiento continuo ni rebotes, solo expresiones */
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
