<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import AppLogoIcon from '@/components/AppLogoIcon.vue';
import { Toaster } from '@/components/ui/sonner';
defineProps<{ title?: string; description?: string }>();
</script>
<template>
  <Toaster />
  <main id="contenido" tabindex="-1" class="relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 outline-hidden md:p-10">
    <div class="absolute top-4 right-4"><AppearanceToggle /></div>
    <div class="w-full max-w-sm"><div class="flex flex-col gap-8">
      <div class="flex flex-col items-center gap-4">
        <RouterLink to="/" class="flex flex-col items-center gap-2 font-medium">
          <div class="mb-1 flex h-9 w-9 items-center justify-center rounded-md"><AppLogoIcon class="size-9 object-contain" /></div>
          <span class="sr-only">{{ title }}</span>
        </RouterLink>
        <div class="flex flex-col gap-2 text-center"><h1 class="text-xl font-medium">{{ title }}</h1><p class="text-center text-sm text-muted-foreground">{{ description }}</p></div>
      </div>
      <slot />
    </div></div>
  </main>
</template>
