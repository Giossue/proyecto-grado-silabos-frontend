<script setup lang="ts">
import PurgeConfirmationDialog from '@/components/domain/PurgeConfirmationDialog.vue';
import ScreenHelpButton from '@/components/domain/ScreenHelpButton.vue';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
</script>

<template>
    <div class="min-h-dvh min-w-0 bg-background text-foreground">
        <TooltipProvider>
            <main id="contenido" tabindex="-1" class="min-h-dvh w-full outline-hidden">
                <slot />
            </main>
            <ScreenHelpButton editor-mode corner="left" />
        </TooltipProvider>

        <Toaster />
        <PurgeConfirmationDialog />
    </div>
</template>
