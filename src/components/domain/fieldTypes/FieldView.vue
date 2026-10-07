<script setup lang="ts">
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldTypeEntry } from '@/components/domain/fieldTypes/registry';
import { Badge } from '@/components/ui/badge';
import type { TypedField } from '@/types/configuration';

/** Un campo en solo lectura (borrador cerrado o revisión): etiqueta y el componente de vista de su tipo. */
defineProps<{ field: TypedField; badge?: string }>();
</script>

<template>
  <div class="syllabus-readonly-field flex flex-col gap-2 rounded-md border bg-muted/30 p-4">
    <div v-if="field.label.trim() || badge" class="flex flex-wrap items-center gap-2 font-medium">{{ field.label }}<Badge v-if="badge" variant="outline">{{ badge }}</Badge></div>
    <component :is="fieldTypeEntry(field.type)!.ViewComponent" v-if="fieldTypeEntry(field.type)" :field="field" />
    <FreeTextContent v-else :value="field.value" />
  </div>
</template>
