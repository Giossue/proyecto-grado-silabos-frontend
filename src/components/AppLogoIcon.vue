<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
defineOptions({ inheritAttrs: false });
defineProps<{ className?: HTMLAttributes['class'] }>();
</script>
<template>
  <img src="/logo.png" alt="Sílabos UEB" :class="className" v-bind="$attrs" />
</template>
