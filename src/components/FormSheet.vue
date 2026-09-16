<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";

const props = defineProps<{ open: boolean; title: string; description?: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement | null>(null);
const titleId = useId();
let previousFocus: HTMLElement | null = null;

const focusableElements = (): HTMLElement[] =>
  Array.from(
    dialog.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  );

const focusDialog = async (): Promise<void> => {
  previousFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  await nextTick();
  (focusableElements()[0] ?? dialog.value)?.focus();
};

const restoreFocus = (): void => {
  previousFocus?.focus();
  previousFocus = null;
};

const onKeydown = (event: KeyboardEvent): void => {
  if (!props.open) return;
  if (event.key === "Escape") {
    event.preventDefault();
    emit("close");
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = focusableElements();
  if (!focusable.length) {
    event.preventDefault();
    dialog.value?.focus();
    return;
  }
  const first = focusable[0]!;
  const last = focusable.at(-1)!;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

watch(
  () => props.open,
  (open, wasOpen) => {
    if (open) void focusDialog();
    else if (wasOpen) restoreFocus();
  },
  { immediate: true },
);
onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown);
  if (props.open) restoreFocus();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop">
      <aside ref="dialog" class="form-sheet" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1">
        <header><div><h2 :id="titleId">{{ title }}</h2><p v-if="description">{{ description }}</p></div><button class="icon-button" type="button" aria-label="Cerrar" @click="emit('close')">×</button></header>
        <div class="form-sheet-content"><slot /></div>
      </aside>
    </div>
  </Teleport>
</template>
