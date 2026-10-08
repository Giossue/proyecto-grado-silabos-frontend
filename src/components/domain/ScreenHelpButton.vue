<script setup lang="ts">
import { CircleHelp } from '@lucide/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getScreenHelp, type ScreenHelp } from '@/api/screen-help';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { sessionState } from '@/state/session';

const STORAGE_KEY = 'silabos:ayuda-posicion';
const SIZE = 44;
const MARGIN = 8;
const STEP = 16;

const route = useRoute();
const help = ref<ScreenHelp | null>(null);
const open = ref(false);
const panelId = 'ayuda-pantalla';
const button = ref<{ $el: HTMLElement } | null>(null);
const offset = ref({ right: 24, bottom: 24 });
const bounds = ref({ left: 0, top: 0, right: 0, bottom: 0 });
const screen = computed(() => route.matched.at(-1)?.path ?? '');
const signedIn = computed(() => sessionState.current.value?.active_role != null);
const paragraphs = computed(() => (help.value?.content ?? '').split(/\n{2,}/).map((text) => text.trim()).filter(Boolean));

let request = 0;
const load = async (): Promise<void> => {
  const current = ++request;
  help.value = null;
  open.value = false;
  if (!screen.value || !signedIn.value) return;
  try {
    const result = await getScreenHelp(screen.value);
    if (current === request) help.value = result.help;
  } catch {
    if (current === request) help.value = null;
  }
};

const measure = (): void => {
  const container = button.value?.$el.parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  bounds.value = {
    left: Math.max(rect.left, 0),
    top: Math.max(rect.top, 0),
    right: Math.min(rect.right, window.innerWidth),
    bottom: Math.min(rect.bottom, window.innerHeight),
  };
};
const clamp = (value: number, max: number): number => Math.min(Math.max(value, MARGIN), Math.max(max, MARGIN));
const place = (right: number, bottom: number): void => {
  offset.value = {
    right: clamp(right, bounds.value.right - bounds.value.left - SIZE - MARGIN),
    bottom: clamp(bottom, bounds.value.bottom - bounds.value.top - SIZE - MARGIN),
  };
};
const position = computed(() => ({
  left: `${bounds.value.right - offset.value.right - SIZE}px`,
  top: `${bounds.value.bottom - offset.value.bottom - SIZE}px`,
}));
const remember = (): void => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(offset.value)); } catch { return; }
};
const restore = (): void => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { right?: unknown; bottom?: unknown } | null;
    if (typeof saved?.right === 'number' && typeof saved.bottom === 'number') offset.value = { right: saved.right, bottom: saved.bottom };
  } catch { return; }
};
const refresh = (): void => { measure(); place(offset.value.right, offset.value.bottom); };

let drag: { x: number; y: number; right: number; bottom: number; moved: boolean } | null = null;
const startDrag = (event: PointerEvent): void => {
  measure();
  drag = { x: event.clientX, y: event.clientY, right: offset.value.right, bottom: offset.value.bottom, moved: false };
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
};
const moveDrag = (event: PointerEvent): void => {
  if (!drag) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true;
  open.value = false;
  place(drag.right - dx, drag.bottom - dy);
};
const endDrag = (): void => {
  if (drag?.moved) remember();
  window.setTimeout(() => { drag = null; }, 0);
};
const toggle = (): void => {
  if (drag?.moved) return;
  open.value = !open.value;
};
const nudge = (event: KeyboardEvent): void => {
  if (!event.altKey) return;
  const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, STEP], ArrowDown: [0, -STEP] };
  const move = moves[event.key];
  if (!move) return;
  event.preventDefault();
  measure();
  place(offset.value.right - move[0], offset.value.bottom + move[1]);
  remember();
};

watch([screen, signedIn], () => { void load(); }, { immediate: true });
watch(help, (value) => { if (value) requestAnimationFrame(refresh); });
onMounted(() => {
  restore();
  window.addEventListener('resize', refresh);
});
onBeforeUnmount(() => window.removeEventListener('resize', refresh));
</script>

<template>
  <Popover v-if="help" v-model:open="open">
    <PopoverAnchor as-child>
      <Button
        ref="button"
        type="button"
        size="icon"
        class="fixed z-40 size-11 touch-none rounded-full shadow-lg"
        :style="position"
        aria-label="Ayuda de esta pantalla"
        aria-description="Use Alt y las flechas para mover el botón"
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
    <PopoverContent :id="panelId" class="flex max-h-96 w-80 flex-col gap-3 overflow-y-auto" side="top" align="end" @close-auto-focus.prevent="button?.$el.focus()">
      <h2 class="text-sm font-semibold">{{ help.title }}</h2>
      <p v-for="(text, index) in paragraphs" :key="index" class="text-sm whitespace-pre-line text-muted-foreground">{{ text }}</p>
    </PopoverContent>
  </Popover>
</template>
