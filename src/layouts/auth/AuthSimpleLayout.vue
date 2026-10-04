<script setup lang="ts">
import AppearanceToggle from '@/components/AppearanceToggle.vue';
import AppLogoIcon from '@/components/AppLogoIcon.vue';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
defineProps<{ title?: string; description?: string }>();
</script>
<template>
  <Toaster />
  <div class="auth-shell relative flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 py-16 md:p-10">
    <div class="absolute top-4 right-4"><AppearanceToggle /></div>
    <div class="w-full max-w-md">
      <Card class="auth-panel">
        <CardHeader class="flex flex-col items-center gap-4 text-center">
        <RouterLink to="/" class="flex flex-col items-center gap-2 rounded-lg bg-brand-logo-surface p-2 font-medium">
          <AppLogoIcon class="size-14 object-contain" />
          <span class="sr-only">{{ title }}</span>
        </RouterLink>
        <div class="flex flex-col gap-2"><h1 class="text-xl font-medium">{{ title }}</h1><CardDescription>{{ description }}</CardDescription></div>
        </CardHeader>
        <CardContent><slot /></CardContent>
      </Card>
    </div>
  </div>
</template>
