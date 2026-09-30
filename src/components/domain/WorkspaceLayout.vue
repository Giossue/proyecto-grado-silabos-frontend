<script setup lang="ts">
defineProps<{ variant: 'syllabus' | 'review' }>();
</script>

<template>
    <div class="workspace-layout grid min-w-0 gap-6" :data-layout="variant"><slot /></div>
</template>
