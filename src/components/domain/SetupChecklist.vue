<script setup lang="ts">
import { driver, type Driver } from 'driver.js';
import { checklist, type Checklist } from 'driver.js/checklist';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { setupRoutes } from '@/lib/setupRoutes';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';
import 'driver.js/dist/driver.css';
import 'driver.js/dist/checklist.css';

/** Checklist «Antes de empezar» del Administrador y de Coordinación; sale en todas las pantallas con menú. */
const router = useRouter();
const route = useRoute();
const role = computed(() => sessionState.current.value?.active_role?.code ?? '');
const setup = setupChecklistState.setup;
const steps = computed(() => (setup.value?.steps ?? []).filter((step) => step.key !== setupChecklistState.startKey.value));
const doneCount = computed(() => steps.value.filter((step) => step.done).length);
const plain = (text: string): string => text.replace(/\.$/, '');

let panel: Checklist | null = null;
let titleGuard: MutationObserver | null = null;
let highlight: Driver | null = null;
const clearHighlight = (): void => { highlight?.destroy(); highlight = null; };
const seenKey = (): string => {
  const session = sessionState.current.value;

  return `setup-checklist-seen:${session?.user?.id}:${session?.active_role?.id}`;
};

const point = (key: string, label: string, hint: string): void => {
  const target = setupRoutes[role.value]?.[key];
  panel?.close();
  if (!target) return;
  const link = document.querySelector<HTMLElement>(`a[href="${target}"]`);
  if (link && link.offsetParent !== null) {
    clearHighlight();
    highlight = driver({ popoverClass: 'setup-popover', showButtons: ['close'] });
    highlight.highlight({ element: link, popover: { title: label, description: hint, side: 'right', align: 'center' } });
    return;
  }
  void router.push(target);
};

/** Driver pone un `title` nativo al botón; se sustituye por la ayuda propia (CSS, atributo `data-tip`). */
const guardTooltip = (): void => {
  titleGuard?.disconnect();
  const launcher = document.querySelector<HTMLElement>('.setup-checklist .driver-checklist-launcher');
  if (!launcher) return;
  launcher.dataset.tip = launcher.querySelector('.driver-checklist-launcher-text')?.textContent?.trim() || 'Antes de empezar';
  launcher.removeAttribute('title');
  titleGuard = new MutationObserver(() => launcher.removeAttribute('title'));
  titleGuard.observe(launcher, { attributes: true, attributeFilter: ['title'] });
};

const build = (): void => {
  const wasOpen = panel?.isOpen() ?? false;
  panel?.hide();
  panel = null;
  if (steps.value.length === 0) return;
  panel = checklist({
    id: `setup-${role.value}`,
    title: setup.value?.title,
    description: 'Complete estos pasos para poder abrir la convocatoria',
    launcherText: 'Antes de empezar',
    progressText: '{{done}} de {{total}}',
    launcherProgressText: '{{done}}/{{total}}',
    completeTitle: 'Todo listo',
    completeDescription: 'Ya puede abrir la convocatoria',
    completeLauncherText: 'Todo listo',
    className: doneCount.value < steps.value.length ? 'setup-checklist setup-pending' : 'setup-checklist setup-done',
    completed: steps.value.filter((step) => step.done).map((step) => step.key),
    items: steps.value.map((step) => ({
      id: step.key,
      title: plain(step.label),
      description: step.done ? undefined : plain(step.hint),
      action: () => point(step.key, plain(step.label), plain(step.hint)),
      completeWhen: () => step.done,
    })),
  });
  panel.show();
  guardTooltip();
  const firstTime = doneCount.value < steps.value.length && !localStorage.getItem(seenKey());
  if (firstTime) localStorage.setItem(seenKey(), '1');
  if (firstTime || wasOpen) panel.open();
};

const stopAfterEach = router.afterEach(clearHighlight);
onMounted(() => { build(); void setupChecklistState.refresh(); });
watch(setup, build, { deep: true });
watch(() => route.fullPath, () => { void setupChecklistState.refresh(); });
onBeforeUnmount(() => { titleGuard?.disconnect(); stopAfterEach(); clearHighlight(); panel?.hide(); });
</script>

<template><span hidden data-setup-checklist /></template>
