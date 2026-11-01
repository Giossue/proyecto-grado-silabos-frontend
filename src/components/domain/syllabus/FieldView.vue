<script setup lang="ts">
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import { Badge } from '@/components/ui/badge';
import type { DocumentField } from '@/types/configuration';
import { responsibleLabel } from '@/types/configuration';

defineProps<{ field: DocumentField; badge?: string; bare?: boolean }>();
</script>

<template>
  <div class="syllabus-readonly-field flex flex-col gap-2 rounded-md ring-1 ring-surface-ring bg-muted/30 p-4">
    <div v-if="!bare" class="flex flex-wrap items-center gap-2 font-medium">
      <span v-if="field.label.trim()">{{ field.label }}</span>
      <Badge variant="outline">{{ badge ?? responsibleLabel(field.quien_llena) }}</Badge>
    </div>
    <FreeTextContent :value="field.document ?? field.value" />
  </div>
</template>
