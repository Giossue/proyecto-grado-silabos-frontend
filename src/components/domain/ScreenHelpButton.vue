<script setup lang="ts">
import { CircleHelp } from '@lucide/vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { screenHelpState } from '@/state/screenHelp';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const STORAGE_KEY = 'silabos:ayuda-posicion';
const CORNERS: readonly Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const SIZE = 44;
const MARGIN = 16;
const DRAG_THRESHOLD = 4;

const route = useRoute();
const open = ref(false);
const panelId = 'ayuda-pantalla';
const button = ref<{ $el: HTMLElement } | null>(null);
const corner = ref<Corner>('bottom-right');
const bounds = ref({ left: 0, top: 0, right: 0, bottom: 0 });
const dragging = ref<{ x: number; y: number } | null>(null);
const screen = computed(() => route.matched.at(-1)?.path ?? '');
const help = computed(() => screenHelpState.forScreen(screen.value));
const ready = ref(false);
const settled = ref(false);
const paragraphs = computed(() => (help.value?.content ?? '').split(/\n{2,}/).map((text) => text.trim()).filter(Boolean));
const isTop = computed(() => corner.value.startsWith('top'));
const isLeft = computed(() => corner.value.endsWith('left'));

const measure = (): void => {
  const container = button.value?.$el.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const header = container.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
  if (!ready.value) requestAnimationFrame(() => { settled.value = true; });
  ready.value = true;
  bounds.value = {
    left: Math.max(rect.left, 0),
    top: Math.max(rect.top, header, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight),
  };
};

const cornerPosition = (value: Corner): { x: number; y: number } => ({
  x: value.endsWith('left') ? bounds.value.left + MARGIN : bounds.value.right - SIZE - MARGIN,
  y: value.startsWith('top') ? bounds.value.top + MARGIN : bounds.value.bottom - SIZE - MARGIN,
});

const style = computed(() => {
  const point = dragging.value ?? cornerPosition(corner.value);

  return { left: `${point.x}px`, top: `${point.y}px`, visibility: ready.value ? 'visible' : 'hidden' } as const;
});

const nearestCorner = (point: { x: number; y: number }): Corner => {
  const centerX = point.x + SIZE / 2;
  const centerY = point.y + SIZE / 2;
  const vertical = centerY < (bounds.value.top + bounds.value.bottom) / 2 ? 'top' : 'bottom';
  const horizontal = centerX < (bounds.value.left + bounds.value.right) / 2 ? 'left' : 'right';

  return `${vertical}-${horizontal}` as Corner;
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
  measure();
  const origin = cornerPosition(corner.value);
  drag = { startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
};
const moveDrag = (event: PointerEvent): void => {
  if (!drag) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
  drag.moved = true;
  open.value = false;
  dragging.value = {
    x: Math.min(Math.max(drag.originX + dx, bounds.value.left), bounds.value.right - SIZE),
    y: Math.min(Math.max(drag.originY + dy, bounds.value.top), bounds.value.bottom - SIZE),
  };
};
const endDrag = (): void => {
  if (drag?.moved && dragging.value) {
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
  if (!event.altKey) return;
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
    }
  });
}, { immediate: true, flush: 'post' });
restore();
onMounted(() => {
  window.addEventListener('resize', refresh);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', refresh);
  observer?.disconnect();
});
</script>

<template>
  <Popover v-if="help" v-model:open="open">
    <PopoverAnchor as-child>
      <Button
        ref="button"
        type="button"
        size="icon"
        class="fixed z-40 size-11 touch-none rounded-full shadow-lg will-change-[left,top]"
        :class="dragging ? 'cursor-grabbing' : ['cursor-grab', settled && 'transition-[left,top] duration-300 ease-out']"
        :style="style"
        aria-label="Ayuda de esta pantalla"
        aria-description="Arrástrelo a una esquina o use Alt y las flechas para moverlo"
        aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :aria-controls="open ? panelId : undefined"
        @pointerdown="startDrag"
        @pointermove="moveDrag"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @click="toggle"
        @keydown="nudge"
      >
        <CircleHelp aria-hidden="true" />
      </Button>
    </PopoverAnchor>
    <PopoverContent :id="panelId" class="flex max-h-96 w-80 flex-col gap-3 overflow-y-auto" :side="isTop ? 'bottom' : 'top'" :align="isLeft ? 'start' : 'end'" @close-auto-focus.prevent="button?.$el.focus()">
      <h2 class="text-sm font-semibold">{{ help.title }}</h2>
      <p v-for="(text, index) in paragraphs" :key="index" class="text-sm whitespace-pre-line text-muted-foreground">{{ text }}</p>
    </PopoverContent>
  </Popover>
</template>
