<script setup lang="ts">
import type { Component } from 'vue';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Una sección de Configuración: acordeón con ícono, título y descripción, igual en todas las pestañas.
defineProps<{ value: string; title: string; description: string; icon: Component }>();
</script>

<template>
    <AccordionItem :value="value">
        <AccordionTrigger>
            <span class="flex items-center gap-3 text-left">
                <component :is="icon" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span class="flex flex-col gap-0.5"><span class="font-medium">{{ title }}</span><span class="text-sm font-normal text-muted-foreground">{{ description }}</span></span>
            </span>
        </AccordionTrigger>
        <AccordionContent>
            <div class="flex flex-col gap-6 px-1 pt-2 pb-2">
                <slot />
            </div>
        </AccordionContent>
    </AccordionItem>
</template>
