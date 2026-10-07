<script setup lang="ts">
import AutomaticFieldView from '@/components/domain/fieldTypes/AutomaticFieldView.vue';
import type { TypedField } from '@/types/configuration';

defineProps<{ field: TypedField; modelValue?: unknown; id?: string; disabled?: boolean }>();
</script>

<template>
  <AutomaticFieldView :field="field" />
</template>
