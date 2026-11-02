<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';

const props = defineProps<{ root: HTMLElement | null }>();

const marks = ref<Array<{ top: number; element: HTMLElement }>>([]);
let observer: ResizeObserver | null = null;

const measure = (): void => {
  const viewport = document.querySelector<HTMLElement>('[data-app-scroll] [data-slot="scroll-area-viewport"]');
  if (props.root === null || viewport === null) {
    marks.value = [];
    return;
  }
  const origin = viewport.getBoundingClientRect().top - viewport.scrollTop;
  marks.value = Array.from(props.root.querySelectorAll<HTMLElement>('[data-changed]')).map((element) => ({
    top: viewport.scrollHeight === 0 ? 0 : Math.min(98, Math.max(0, ((element.getBoundingClientRect().top - origin) / viewport.scrollHeight) * 100)),
    element,
  }));
};

watch(() => props.root, (root) => {
  observer?.disconnect();
  observer = null;
  measure();
  if (root === null || typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(measure);
  observer.observe(root);
}, { immediate: true, flush: 'post' });

onBeforeUnmount(() => observer?.disconnect());

const goTo = (element: HTMLElement): void => element.scrollIntoView({ behavior: 'smooth', block: 'center' });
</script>

<template>
  <div v-if="marks.length" class="pointer-events-none fixed top-14 right-3 bottom-0 z-20 hidden w-3 lg:block" aria-label="Cambios en el documento">
    <Button
      v-for="(mark, index) in marks"
      :key="index"
      type="button"
      variant="ghost"
      class="pointer-events-auto absolute right-0 h-1.5 min-h-0 w-3 rounded-full bg-warning p-0 hover:bg-warning"
      :style="{ top: `${mark.top}%` }"
      :aria-label="`Ir al cambio ${index + 1}`"
      @click="goTo(mark.element)"
    />
  </div>
</template>
