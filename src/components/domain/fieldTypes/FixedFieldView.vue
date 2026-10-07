<script setup lang="ts">
import { computed } from 'vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
const content = computed(() => props.field.value ?? fieldConfig(props.field).content ?? null);
</script>

<template>
  <FreeTextContent :value="content" />
</template>
