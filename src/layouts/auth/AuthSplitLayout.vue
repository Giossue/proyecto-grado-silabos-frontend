<script setup lang="ts">
import campusBanner from '@/assets/ueb-campus-login.webp';
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
            <main id="contenido" tabindex="-1" class="flex flex-1 items-center justify-center outline-hidden">
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
            </main>
        </div>
        <div
            class="relative hidden overflow-hidden bg-brand-surface text-brand-foreground lg:flex lg:items-center lg:justify-center"
        >
            <img
                :src="campusBanner"
                alt="Campus de la Universidad Estatal de Bolívar"
                class="absolute inset-0 size-full object-cover"
                decoding="async"
            />
            <div class="absolute inset-0 bg-brand-surface/70" aria-hidden="true" />
            <div class="relative z-10 flex max-w-md flex-col gap-2 p-10 text-center">
                <p class="text-4xl font-semibold tracking-tight">Sílabos UEB</p>
                <p class="text-lg text-brand-foreground/90">
                    Gestión de sílabos de la Carrera de Software
                </p>
            </div>
        </div>
    </div>
</template>
