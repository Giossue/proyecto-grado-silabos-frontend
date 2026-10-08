<script setup lang="ts">
import { Accessibility, RotateCcw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccessibility, type TextSize } from '@/composables/useAccessibility';

const { settings, reset } = useAccessibility();
const sizes = [
    { value: '100', label: 'Normal' },
    { value: '115', label: 'Grande' },
    { value: '130', label: 'Muy grande' },
    { value: '150', label: 'Máximo' },
];
const toggles = [
    { key: 'highContrast', label: 'Alto contraste', hint: 'Colores más marcados y foco más visible.' },
    { key: 'noMotion', label: 'Sin animaciones', hint: 'Quita transiciones y movimientos.' },
    { key: 'underlineLinks', label: 'Subrayar enlaces', hint: 'Los enlaces se distinguen sin depender del color.' },
    { key: 'wideSpacing', label: 'Texto más espaciado', hint: 'Más espacio entre líneas, letras y palabras.' },
] as const;
const setSize = (value: string): void => { settings.value.textSize = value as TextSize; };
</script>

<template>
  <Dialog>
    <TooltipProvider><Tooltip>
      <TooltipTrigger as-child>
        <DialogTrigger as-child>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Accesibilidad"><Accessibility data-icon="inline-start" aria-hidden="true" /></Button>
        </DialogTrigger>
      </TooltipTrigger>
      <TooltipContent>Accesibilidad</TooltipContent>
    </Tooltip></TooltipProvider>
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Accesibilidad</DialogTitle>
        <DialogDescription>Los cambios se aplican al instante y se guardan en este navegador.</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <p class="text-sm font-medium">Tamaño del texto</p>
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
        <Button type="button" variant="outline" @click="reset"><RotateCcw data-icon="inline-start" aria-hidden="true" />Restablecer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
