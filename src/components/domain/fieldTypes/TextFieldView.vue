<script setup lang="ts">
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import type { TypedField } from '@/types/configuration';

defineProps<{ field: TypedField }>();
</script>

<template>
  <FreeTextContent :value="field.value" />
</template>
