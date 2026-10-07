<script setup lang="ts">
import FixedFieldView from '@/components/domain/fieldTypes/FixedFieldView.vue';
import type { TypedField } from '@/types/configuration';

defineProps<{ field: TypedField; modelValue?: unknown; id?: string; disabled?: boolean }>();
</script>

<template>
  <FixedFieldView :field="field" />
</template>
