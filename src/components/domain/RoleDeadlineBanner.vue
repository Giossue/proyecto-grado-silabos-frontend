<script setup lang="ts">
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import DeadlineBanner from '@/components/domain/DeadlineBanner.vue';
import { deadlineState } from '@/state/deadline';

const route = useRoute();
const { deadline, audience } = deadlineState;

watch(() => route.path, () => { void deadlineState.refresh(); });
</script>

<template>
  <DeadlineBanner v-if="deadline && audience" data-tour="deadline" :deadline="deadline" :audience="audience" />
</template>
