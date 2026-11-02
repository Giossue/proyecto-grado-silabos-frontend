<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { PersonStanding, RotateCcw } from '@lucide/vue';
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { defaultSettings, useAccessibility, type TextSize } from '@/composables/useAccessibility';
import { accessibilityDialogOpen } from '@/state/accessibilityDialog';

const props = defineProps<{ floating?: boolean; remote?: boolean }>();
const localOpen = ref(false);
const open = computed({
  get: () => (props.remote ? accessibilityDialogOpen.value : localOpen.value),
  set: (value: boolean) => { if (props.remote) accessibilityDialogOpen.value = value; else localOpen.value = value; },
});

const { settings, reset } = useAccessibility();
const sizes = [
    { value: '100', label: 'Normal' },
    { value: '115', label: 'Grande' },
    { value: '130', label: 'Muy grande' },
    { value: '150', label: 'Máximo' },
];
const toggles = [
    { key: 'highContrast', label: 'Alto contraste', hint: 'Colores más marcados y foco más visible' },
    { key: 'noMotion', label: 'Sin animaciones', hint: 'Quita transiciones y movimientos' },
    { key: 'wideSpacing', label: 'Texto más espaciado', hint: 'Más espacio entre líneas, letras y palabras' },
] as const;
const isDefault = computed(() => {
  const defaults = defaultSettings();

  return (Object.keys(defaults) as (keyof typeof defaults)[]).every((key) => settings.value[key] === defaults[key]);
});
const setSize = (value: string): void => { settings.value.textSize = value as TextSize; };
</script>

<template>
  <Dialog v-model:open="open">
    <TooltipProvider v-if="!remote"><Tooltip>
      <TooltipTrigger as-child>
        <IconTooltip label="Accesibilidad"><DialogTrigger as-child>
          <Button v-if="floating" type="button" size="icon" class="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-menu [&_svg]:size-5 max-sm:hidden" aria-label="Accesibilidad"><PersonStanding aria-hidden="true" /></Button>
          <Button v-else type="button" variant="ghost" size="icon-sm" aria-label="Accesibilidad"><PersonStanding data-icon="inline-start" aria-hidden="true" /></Button>
        </DialogTrigger></IconTooltip>
      </TooltipTrigger>
      <TooltipContent side="left">Accesibilidad</TooltipContent>
    </Tooltip></TooltipProvider>
    <DialogContent :aria-describedby="undefined" class="max-w-md">
      <DialogHeader>
        <DialogTitle>Accesibilidad</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium" aria-hidden="true">Tamaño del texto</p>
          <ChoiceGroup :model-value="settings.textSize" :options="sizes" label="Tamaño del texto" @update:model-value="setSize" />
        </div>
        <div v-for="toggle in toggles" :key="toggle.key" class="flex items-center justify-between gap-4">
          <div class="flex flex-col">
            <label :for="`accessibility-${toggle.key}`" class="text-sm font-medium">{{ toggle.label }}</label>
            <span class="text-sm text-muted-foreground">{{ toggle.hint }}</span>
          </div>
          <Switch :id="`accessibility-${toggle.key}`" v-model="settings[toggle.key]" />
        </div>
      </div>
      <DialogFooter>
        <DialogClose as-child>
          <Button type="button" variant="outline">Cerrar</Button>
        </DialogClose>
        <Button type="button" :disabled="isDefault" @click="reset"><RotateCcw data-icon="inline-start" aria-hidden="true" />Restablecer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
