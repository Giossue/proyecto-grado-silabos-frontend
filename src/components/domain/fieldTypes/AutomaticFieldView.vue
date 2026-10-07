<script setup lang="ts">
import { computed } from 'vue';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldConfig } from '@/components/domain/fieldTypes/fieldConfig';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
const card = computed(() => fieldConfig(props.field).source === 'identification_card');
</script>

<template>
  <FreeTextContent v-if="card" :value="field.document" empty-text="Se completa con los datos del sílabo al enviarlo." />
  <p v-else class="text-sm text-muted-foreground">Se completa automáticamente.</p>
</template>
