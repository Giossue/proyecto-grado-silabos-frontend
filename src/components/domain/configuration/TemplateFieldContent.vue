<script setup lang="ts">
import { computed } from 'vue';
import type { TemplateField } from '@/api/template';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import { responsibleLabel } from '@/types/configuration';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

const props = defineProps<{ field: TemplateField; preview?: boolean; variables?: TemplateVariable[] }>();
const sample = (node: DocumentNode): DocumentNode => node.type === 'variable'
    ? { type: 'text', text: props.variables?.find((item) => item.key === node.attrs?.id)?.[props.preview ? 'sample' : 'label'] || 'Dato del sistema' }
    : { ...node, ...(node.content ? { content: node.content.map(sample) } : {}) };
const content = computed(() => sample(props.field.content));
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1">
    <div v-if="field.label.trim() || !preview" data-field-label class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
      <h4 v-if="field.label.trim()" class="min-w-0 break-words font-bold [overflow-wrap:anywhere]">{{ field.label }}</h4>
      <span v-else-if="!preview" class="text-xs italic text-muted-foreground">Campo sin nombre</span>
      <span v-if="!preview" class="ml-auto max-w-full rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground" data-field-responsible>{{ responsibleLabel(field.quien_llena) }}</span>
    </div>
    <div data-field-body><FreeTextContent :value="content" /></div>
  </div>
</template>
