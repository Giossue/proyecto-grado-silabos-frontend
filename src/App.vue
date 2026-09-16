<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { RouterView } from 'vue-router';
import AppShell from '@/components/AppShell.vue';

const route = useRoute();
const usesShell = computed(() => route.meta.requiresAuth === true && route.meta.shell !== false);
</script>

<template>
  <AppShell v-if="usesShell"><RouterView /></AppShell>
  <RouterView v-else />
</template>
