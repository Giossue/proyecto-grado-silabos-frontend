<script setup lang="ts">
import { computed } from 'vue';
import { freeTextPlain, isFreeTextDocument, renderFreeText } from '@/components/domain/syllabus/freeTextRender';

const props = withDefaults(defineProps<{ value: unknown; emptyText?: string }>(), { emptyText: 'Sin contenido' });
const document = computed(() => (isFreeTextDocument(props.value) ? props.value : null));
const empty = computed(() => document.value === null || freeTextPlain(document.value).trim() === '' && !JSON.stringify(document.value).includes('"table"'));
const Rendered = (rendered: { node: NonNullable<typeof document.value> }) => renderFreeText(rendered.node);
</script>

<template>
  <p v-if="empty" class="text-sm text-muted-foreground">{{ emptyText }}</p>
  <div v-else class="free-text-content text-sm"><Rendered :node="document!" /></div>
</template>

<style scoped>
.free-text-content :deep(p) { margin: 0 0 0.35em; }
.free-text-content :deep(ul) { list-style: disc; padding-left: 1.25rem; }
.free-text-content :deep(ol) { list-style: decimal; padding-left: 1.25rem; }
.free-text-content :deep(.free-text-table) { border-collapse: collapse; margin: 0.35em 0; width: 100%; }
.free-text-content :deep(.free-text-table td),
.free-text-content :deep(.free-text-table th) { border: 1px solid var(--border); padding: 0.25rem 0.5rem; vertical-align: top; }
</style>
