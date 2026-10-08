<script setup lang="ts">
import PurgeConfirmationDialog from '@/components/domain/PurgeConfirmationDialog.vue';
import { Toaster } from '@/components/ui/sonner';
</script>

<template>
    <div class="min-h-dvh min-w-0 bg-background text-foreground">
        <main id="contenido" tabindex="-1" class="min-h-dvh w-full outline-none">
            <slot />
        </main>

        <Toaster />
        <PurgeConfirmationDialog />
    </div>
</template>
