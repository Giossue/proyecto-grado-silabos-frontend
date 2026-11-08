<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { X } from "@lucide/vue"
import { DialogClose } from "reka-ui"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const props = defineProps<{ class?: HTMLAttributes["class"] }>()
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <DialogClose
          data-slot="dialog-close-x"
          aria-label="Cerrar"
          :class="cn('focus-visible:ring-ring/50 focus-visible:ring-3 outline-hidden absolute inline-flex size-8 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none', props.class)"
        >
          <X class="size-4" aria-hidden="true" />
          <span class="sr-only">Cerrar</span>
        </DialogClose>
      </TooltipTrigger>
      <TooltipContent>Cerrar</TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
