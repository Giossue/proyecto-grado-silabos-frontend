<script setup lang="ts">
import { computed } from 'vue';
import type { TemplateField } from '@/api/template';
import FreeTextContent from '@/components/domain/syllabus/FreeTextContent.vue';
import { responsibleLabel } from '@/types/configuration';
import { RESPONSE_NODE, responseAnswered, responseAttrs } from '@/lib/responseKinds';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

const props = defineProps<{ field: TemplateField; preview?: boolean; variables?: TemplateVariable[] }>();
const shown = (node: DocumentNode): DocumentNode[] => {
    if (node.type === RESPONSE_NODE && props.preview && !responseAnswered(responseAttrs(node))) return [];
    if (node.type !== 'variable') return [{ ...node, ...(node.content ? { content: node.content.flatMap(shown) } : {}) }];
    if (props.preview) return [];

    return [{ type: 'text', text: props.variables?.find((item) => item.key === node.attrs?.id)?.label || 'Dato del sistema' }];
};
const content = computed(() => shown(props.field.content)[0] ?? props.field.content);
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
