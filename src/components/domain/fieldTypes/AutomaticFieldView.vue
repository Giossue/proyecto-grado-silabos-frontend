<script setup lang="ts">
import { computed } from 'vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
const card = computed(() => fieldConfig(props.field).source === 'identification_card');
</script>

<template>
  <div v-if="card" class="automatic-card"><FreeTextContent :value="field.document" empty-text="Se completa con los datos del sílabo al enviarlo." /></div>
  <p v-else class="text-sm text-muted-foreground">Se completa automáticamente.</p>
</template>

<style scoped>
.automatic-card { max-width: 100%; overflow-x: auto; font-size: 7.5pt; }
.automatic-card :deep(.free-text-content) { font-size: inherit; }
.automatic-card :deep(.free-text-table) { table-layout: fixed; }
.automatic-card :deep(.free-text-table td) { overflow-wrap: anywhere; padding: 0.1rem 0.25rem; }
</style>
