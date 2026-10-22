<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { CircleHelp } from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { helpScreens } from '@/lib/helpScreens';
import { screenHelpState } from '@/state/screenHelp';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const props = withDefaults(defineProps<{ editorMode?: boolean }>(), { editorMode: false });

const STORAGE_KEY = 'silabos:ayuda-posicion';
const CORNERS: readonly Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const BASE_SIZE = 48;
const MARGIN = 16;
const DRAG_THRESHOLD = 3;

const route = useRoute();
const open = ref(false);
const panelId = 'ayuda-pantalla';
const button = ref<{ $el: HTMLElement } | null>(null);
const stored = ref<Corner>('bottom-left');
const compact = useMediaQuery('(width < 40rem)');
const corner = computed<Corner>({
  get: () => (props.editorMode ? 'bottom-right' : compact.value ? 'bottom-left' : stored.value),
  set: (value) => { stored.value = value; },
});
const bounds = ref({ left: 0, top: 0, right: 0, bottom: 0 });
const area = ref({ left: 0, top: 0, right: 0, bottom: 0 });
const size = ref(BASE_SIZE);
const dragging = ref<{ x: number; y: number } | null>(null);
const screen = computed(() => route.matched.at(-1)?.path ?? '');
const help = computed(() => screenHelpState.forScreen(screen.value));
const ready = ref(false);
const animating = ref(false);
const paragraphs = computed(() => (help.value?.content ?? '').split(/\n{2,}/).map((text) => text.trim()).filter(Boolean));
const title = computed(() => helpScreens.find((item) => item.key === screen.value)?.label ?? help.value?.title ?? '');
const isTop = computed(() => corner.value.startsWith('top'));
const isLeft = computed(() => corner.value.endsWith('left'));

const measure = (): void => {
  const container = button.value?.$el.parentElement;
  if (!container) return;
  size.value = button.value?.$el.offsetWidth || BASE_SIZE;
  const rect = container.getBoundingClientRect();
  const bar = container.querySelector('header')?.getBoundingClientRect();
  const bottomBar = bar !== undefined && bar.top > window.innerHeight / 2;
  const header = bar && !bottomBar ? bar.bottom : 0;
  ready.value = true;
  area.value = {
    left: Math.max(rect.left, 0),
    top: Math.max(rect.top, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight),
  };
  bounds.value = {
    left: Math.max(rect.left, 0),
    top: Math.max(rect.top, header, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight, bottomBar && bar ? bar.top : Infinity),
  };
};

const cornerPosition = (value: Corner): { x: number; y: number } => ({
  x: value.endsWith('left') ? bounds.value.left + MARGIN : bounds.value.right - size.value - MARGIN,
  y: value.startsWith('top') ? bounds.value.top + MARGIN : bounds.value.bottom - size.value - MARGIN - (value === 'bottom-right' && !props.editorMode ? (size.value * 7) / 6 + MARGIN : 0),
});

const style = computed(() => {
  const point = dragging.value ?? cornerPosition(corner.value);

  return { transform: `translate3d(${point.x}px, ${point.y}px, 0)`, visibility: ready.value ? 'visible' : 'hidden' } as const;
});

const nearestCorner = (point: { x: number; y: number }): Corner => {
  const centerX = point.x + size.value / 2;
  const centerY = point.y + size.value / 2;
  const vertical = centerY < (bounds.value.top + bounds.value.bottom) / 2 ? 'top' : 'bottom';
  const horizontal = centerX < (bounds.value.left + bounds.value.right) / 2 ? 'left' : 'right';

  return `${vertical}-${horizontal}` as Corner;
};

let animationTimer = 0;
const animateNextMove = (): void => {
  animating.value = true;
  window.clearTimeout(animationTimer);
  animationTimer = window.setTimeout(() => { animating.value = false; }, 260);
};

const remember = (): void => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ corner: corner.value })); } catch { return; }
};
const restore = (): void => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { corner?: unknown } | null;
    if (CORNERS.includes(saved?.corner as Corner)) corner.value = saved?.corner as Corner;
  } catch { return; }
};

let drag: { startX: number; startY: number; originX: number; originY: number; moved: boolean } | null = null;
const startDrag = (event: PointerEvent): void => {
  if (compact.value || props.editorMode) return;
  measure();
  const origin = cornerPosition(corner.value);
  drag = { startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
};
let frame = 0;
let pointer = { x: 0, y: 0 };
const applyDrag = (): void => {
  frame = 0;
  if (!drag?.moved) return;
  dragging.value = {
    x: Math.min(Math.max(drag.originX + pointer.x - drag.startX, area.value.left), area.value.right - size.value),
    y: Math.min(Math.max(drag.originY + pointer.y - drag.startY, area.value.top), area.value.bottom - size.value),
  };
};
const moveDrag = (event: PointerEvent): void => {
  if (!drag) return;
  if (event.buttons === 0) { endDrag(); return; }
  pointer = { x: event.clientX, y: event.clientY };
  if (!drag.moved && Math.hypot(pointer.x - drag.startX, pointer.y - drag.startY) < DRAG_THRESHOLD) return;
  drag.moved = true;
  open.value = false;
  if (!frame) frame = requestAnimationFrame(applyDrag);
};
const endDrag = (): void => {
  window.removeEventListener('pointerup', endDrag);
  window.removeEventListener('pointercancel', endDrag);
  window.removeEventListener('blur', endDrag);
  if (frame) { cancelAnimationFrame(frame); applyDrag(); }
  if (drag?.moved && dragging.value) {
    animateNextMove();
    corner.value = nearestCorner(dragging.value);
    remember();
  }
  dragging.value = null;
  window.setTimeout(() => { drag = null; }, 0);
};
const toggle = (): void => {
  if (drag?.moved) return;
  open.value = !open.value;
};
const nudge = (event: KeyboardEvent): void => {
  if (!event.altKey || compact.value || props.editorMode) return;
  const keys: Record<string, (current: Corner) => Corner> = {
    ArrowLeft: (current) => `${current.split('-')[0]}-left` as Corner,
    ArrowRight: (current) => `${current.split('-')[0]}-right` as Corner,
    ArrowUp: (current) => `top-${current.split('-')[1]}` as Corner,
    ArrowDown: (current) => `bottom-${current.split('-')[1]}` as Corner,
  };
  const move = keys[event.key];
  if (!move) return;
  event.preventDefault();
  measure();
  animateNextMove();
  corner.value = move(corner.value);
  open.value = false;
  remember();
};

let observer: ResizeObserver | null = null;
const refresh = (): void => { measure(); };

watch(screen, () => { open.value = false; });
watch(help, (value) => {
  if (!value) return;
  void nextTick(() => {
    refresh();
    const container = button.value?.$el.parentElement;
    if (container && !observer && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(refresh);
      observer.observe(container);
      if (button.value) observer.observe(button.value.$el);
    }
  });
}, { immediate: true, flush: 'post' });
restore();
onMounted(() => {
  window.addEventListener('resize', refresh);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', refresh);
  endDrag();
  observer?.disconnect();
  window.clearTimeout(animationTimer);
});
</script>

<template>
  <Popover v-if="help" v-model:open="open">
    <PopoverAnchor as-child>
      <Button
        ref="button"
        type="button"
        size="icon"
        variant="secondary"
        class="fixed top-0 left-0 z-40 size-12 touch-none rounded-full bg-ring text-background shadow-menu will-change-transform hover:bg-ring/90 [&_svg]:size-5"
        :class="dragging ? 'cursor-grabbing transition-none' : [compact || props.editorMode ? 'cursor-pointer' : 'cursor-grab', animating ? 'transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]' : 'transition-none']"
        :style="style"
        aria-label="Ayuda de esta pantalla"
        :aria-description="compact || props.editorMode ? undefined : 'Arrástrelo a una esquina o use Alt y las flechas para moverlo'"
        :aria-keyshortcuts="compact || props.editorMode ? undefined : 'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight'"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-controls="open ? panelId : undefined"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @lostpointercapture="endDrag"
        @click="toggle"
        @keydown="nudge"
      >
        <CircleHelp aria-hidden="true" />
      </Button>
    </PopoverAnchor>
    <PopoverContent :id="panelId" class="w-80 p-0" :side="isTop ? 'bottom' : 'top'" :align="isLeft ? 'start' : 'end'" @close-auto-focus.prevent="button?.$el.focus()">
      <ScrollArea class="[&>[data-slot=scroll-area-viewport]]:max-h-96">
        <div class="flex flex-col gap-3 p-4">
          <h2 class="text-sm font-semibold">{{ title }}</h2>
          <p v-for="(text, index) in paragraphs" :key="index" class="text-sm whitespace-pre-line">{{ text }}</p>
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
</template>
