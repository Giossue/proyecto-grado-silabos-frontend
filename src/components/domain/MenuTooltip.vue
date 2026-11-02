<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

defineProps<{ label: string }>();
</script>

<!--
  Tooltip para un botón que abre un menú. El `DropdownMenu` va DENTRO de este componente: si el tooltip envolviera
  solo al botón, el botón se anclaría al tooltip y el menú saldría fuera de la pantalla sin posicionarse.
-->
<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <span class="inline-flex"><slot /></span>
      </TooltipTrigger>
      <TooltipContent>{{ label }}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
