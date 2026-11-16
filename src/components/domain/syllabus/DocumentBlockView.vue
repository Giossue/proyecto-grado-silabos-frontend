<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/vue-3';
import { computed } from 'vue';
import DocumentBlockContent from '@/components/domain/syllabus/DocumentBlockContent';
import { variableLabels } from '@/components/domain/syllabus/fieldDocumentExtensions';
import { blockAttrs } from '@/lib/blocks/runtime';
import type { DocumentNode } from '@/lib/templateDocument';

const props = defineProps<NodeViewProps>();

const attrs = computed(() => blockAttrs(props.node as unknown as DocumentNode));
const mode = computed(() => {
    if (!props.editor.isEditable) return 'read';
    return props.extension.options.mode === 'configure' ? 'configure' : 'fill';
});
const labels = computed(() => variableLabels(props.editor));
const setValue = (value: Record<string, unknown>): void => props.updateAttributes({ value });
const setProps = (next: Record<string, unknown>): void => props.updateAttributes({ props: next });
</script>

<template>
  <NodeViewWrapper as="div" data-block :data-kind="attrs.kind" contenteditable="false" class="document-block">
    <DocumentBlockContent :kind="attrs.kind" :props="attrs.props" :value="attrs.value" :mode="mode" :labels="labels" @update:value="setValue" @update:props="setProps" />
  </NodeViewWrapper>
</template>
