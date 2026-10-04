<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import { Toaster } from '@/components/ui/sonner';

defineProps<{
    title?: string;
    description?: string;
}>();
</script>

<template>
    <Toaster />
    <div class="grid min-h-svh bg-background lg:grid-cols-2">
        <div class="relative flex flex-col gap-4 p-6 md:p-10">
            <div class="flex items-center justify-end">
                <AppearanceToggle />
            </div>
            <div class="flex flex-1 items-center justify-center">
                <div class="flex w-full max-w-sm flex-col gap-6">
                    <div class="flex flex-col gap-2 text-center">
                        <h1 v-if="title" class="text-2xl font-semibold tracking-tight">
                            {{ title }}
                        </h1>
                        <p v-if="description" class="text-sm text-muted-foreground">
                            {{ description }}
                        </p>
                    </div>
                    <slot />
                </div>
            </div>
        </div>
        <div
            class="relative hidden flex-col items-center justify-center gap-6 bg-brand-surface p-10 text-brand-foreground lg:flex"
        >
            <div class="flex items-center justify-center">
                <img src="/logo-ueb.png" alt="Universidad Estatal de Bolívar" class="size-56 object-contain" />
            </div>
            <div class="flex max-w-md flex-col gap-2 text-center">
                <p class="text-2xl font-semibold">Sílabos UEB</p>
                <p class="text-sm text-brand-foreground/80">
                    Gestión de sílabos de la Carrera de Software
                </p>
            </div>
        </div>
    </div>
</template>
