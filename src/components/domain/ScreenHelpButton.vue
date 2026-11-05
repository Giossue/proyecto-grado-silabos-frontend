<script setup lang="ts">
import { CircleHelp } from '@lucide/vue';
import { driver, type Driver, type DriveStep } from 'driver.js';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { helpScreens } from '@/lib/helpScreens';
import { screenTours } from '@/lib/screenTours';
import { cn } from '@/lib/utils';
import { screenHelpState } from '@/state/screenHelp';
import 'driver.js/dist/driver.css';

const props = withDefaults(defineProps<{ editorMode?: boolean; corner?: 'left' | 'right' }>(), { editorMode: false, corner: 'right' });

const route = useRoute();
const button = ref<{ $el: HTMLElement } | null>(null);
const screen = computed(() => route.matched.at(-1)?.path ?? '');
const help = computed(() => screenHelpState.forScreen(screen.value));
const title = computed(() => helpScreens.find((item) => item.key === screen.value)?.label ?? help.value?.title ?? '');
const paragraphs = computed(() => (help.value?.content ?? '').split(/\n{2,}/).map((text) => text.trim()).filter(Boolean));

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const visible = (selector: string): HTMLElement | null => {
  const element = document.querySelector<HTMLElement>(selector);

  return element && element.getClientRects().length > 0 ? element : null;
};

let tour: Driver | null = null;
const stop = (): void => { tour?.destroy(); tour = null; };

const start = (): void => {
  stop();
  const found = (screenTours[screen.value] ?? [])
    .map((item) => ({ item, element: visible(item.selector) }))
    .filter((entry): entry is { item: (typeof entry)['item']; element: HTMLElement } => entry.element !== null);
  const intro = found.length === 0 ? paragraphs.value : paragraphs.value.slice(0, 1);
  const steps: DriveStep[] = [
    { popover: { title: title.value, description: intro.map(escape).join('<br><br>') } },
    ...found.map(({ item, element }) => ({ element, popover: { title: item.title, description: escape(item.description), side: item.side ?? 'bottom', align: 'center' as const } })),
  ];
  tour = driver({
    steps,
    popoverClass: 'setup-popover screen-tour',
    showProgress: found.length > 0,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
    doneBtnText: 'Listo',
    showButtons: found.length > 0 ? ['next', 'previous', 'close'] : ['close'],
    disableActiveInteraction: true,
    smoothScroll: true,
    stagePadding: 6,
    stageRadius: 8,
    overlayOpacity: 0.55,
    onDestroyed: () => { tour = null; button.value?.$el.focus(); },
  });
  tour.drive();
};

watch(() => route.fullPath, stop);
onBeforeUnmount(stop);
</script>

<template>
  <TooltipProvider v-if="help">
    <Tooltip>
      <TooltipTrigger as-child>
        <Button
          ref="button"
          type="button"
          size="icon"
          variant="secondary"
          :class="cn(
            'fixed z-40 size-12 rounded-full bg-ring text-background shadow-menu hover:bg-ring/90 [&_svg]:size-5',
            'max-sm:left-4', props.editorMode ? 'max-sm:bottom-20' : 'max-sm:bottom-(--page-mobile-actions-bottom)', props.corner === 'left' ? 'sm:left-4' : 'sm:right-4',
            props.editorMode ? 'sm:bottom-4' : 'sm:bottom-20',
          )"
          aria-label="Ayuda de esta pantalla"
          @click="start"
        >
          <CircleHelp aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent :side="props.corner === 'left' ? 'right' : 'left'">Ayuda de esta pantalla</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
