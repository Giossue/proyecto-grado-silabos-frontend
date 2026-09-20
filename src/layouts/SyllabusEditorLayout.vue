<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import PurgeConfirmationDialog from '@/components/domain/PurgeConfirmationDialog.vue';
import { Toaster } from '@/components/ui/sonner';
</script>

<template>
    <div class="min-h-dvh min-w-0 bg-background text-foreground">
        <div
            class="pointer-events-none fixed inset-x-0 top-0 z-20 flex justify-end p-3"
        >
            <div
                class="pointer-events-auto rounded-md border bg-background/95 shadow-control backdrop-blur"
            >
                <AppearanceToggle />
            </div>
        </div>

        <main class="min-h-dvh w-full pt-12">
            <slot />
        </main>

        <Toaster />
        <PurgeConfirmationDialog />
    </div>
</template>
