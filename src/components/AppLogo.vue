<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue';
</script>
<template>
  <div class="flex h-10 w-full items-center justify-center px-1 group-data-[collapsible=icon]:hidden">
    <img src="/logo-ueb.png" alt="Universidad Estatal de Bolívar" class="h-9 w-auto object-contain" />
  </div>
  <div class="hidden aspect-square size-8 items-center justify-center rounded-md bg-brand-logo-surface group-data-[collapsible=icon]:flex">
    <AppLogoIcon class="size-7 object-contain" />
  </div>
</template>
