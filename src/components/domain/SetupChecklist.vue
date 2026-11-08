<script setup lang="ts">
import { checklist, type Checklist } from 'driver.js/checklist';
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useScrollDirection } from '@/composables/useScrollDirection';
import { setupRoutes } from '@/lib/setupRoutes';
import { sessionState } from '@/state/session';
import { setupChecklistState } from '@/state/setupChecklist';
import 'driver.js/dist/checklist.css';

/** Checklist «Antes de empezar» del Administrador y de Coordinación; sale en todas las pantallas con menú. */
const router = useRouter();
const route = useRoute();
const role = computed(() => sessionState.current.value?.active_role?.code ?? '');
const setup = setupChecklistState.setup;
const plain = (text: string): string => text.replace(/\.$/, '');
const steps = setupChecklistState.steps;
/** Con los pasos hechos, el panel solo invita a abrir cuando de verdad se puede; si no, dice qué falta o que ya está abierta. */
const complete = computed(() => {
  const start = setupChecklistState.start.value;
  if (start?.done) return { title: 'Todo listo', description: 'La convocatoria ya está abierta' };
  if (!start || start.action) return { title: 'Todo listo', description: 'Ya puede abrir la convocatoria' };

  return { title: 'Pasos completos', description: plain(start.hint) };
});
const doneCount = computed(() => steps.value.filter((step) => step.done).length);
const { hidden } = useScrollDirection();

let panel: Checklist | null = null;
let titleGuard: MutationObserver | null = null;
const seenKey = (): string => {
  const session = sessionState.current.value;

  return `setup-checklist-seen:${session?.user?.id}:${session?.active_role?.id}`;
};

/** Cada paso lleva directo a la pantalla donde se completa. */
const point = (key: string): void => {
  const target = setupRoutes[role.value]?.[key];
  panel?.close();
  if (target) void router.push(target);
};

/** Driver dibuja el botón fuera de Vue; el estilo lo esconde en móvil con este atributo. */
const syncScrollHidden = (): void => {
  document.querySelector('.driver-checklist.setup-checklist')?.toggleAttribute('data-scroll-hidden', hidden.value);
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
    completeTitle: complete.value.title,
    completeDescription: complete.value.description,
    completeLauncherText: complete.value.title,
    className: doneCount.value < steps.value.length ? 'setup-checklist setup-pending' : 'setup-checklist setup-done',
    completed: steps.value.filter((step) => step.done).map((step) => step.key),
    items: steps.value.map((step) => ({
      id: step.key,
      title: plain(step.label),
      description: step.done ? undefined : plain(step.hint),
      action: () => point(step.key),
      completeWhen: () => step.done,
    })),
  });
  panel.show();
  guardTooltip();
  syncScrollHidden();
  const firstTime = doneCount.value < steps.value.length && !localStorage.getItem(seenKey());
  if (firstTime) localStorage.setItem(seenKey(), '1');
  if (firstTime || wasOpen) panel.open();
};

onMounted(() => { build(); void setupChecklistState.refresh(); });
watch(setup, build, { deep: true });
watch(hidden, syncScrollHidden);
watch(setupChecklistState.openRequests, () => panel?.open());
watch(() => route.fullPath, () => { void setupChecklistState.refresh(); });
onBeforeUnmount(() => { titleGuard?.disconnect(); panel?.hide(); });
</script>

<template><span hidden data-setup-checklist /></template>
