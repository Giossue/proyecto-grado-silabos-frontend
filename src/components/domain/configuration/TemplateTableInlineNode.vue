<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed } from 'vue';
import { inlineNodeLabel, markClass, SHEET_MARK_HINTS, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const props = defineProps(nodeViewProps);

const kind = computed(() => props.node.type.name);
const label = computed(() =>
    inlineNodeLabel(
        kind.value,
        props.node.attrs,
        props.extension.options.variableLabel as
            | ((id: string) => string | undefined)
            | undefined,
    ),
);
const mark = computed(() => sheetMark(kind.value, props.node.attrs));
const tokenClass = computed(() => markClass[mark.value]);
const dataAttributes = computed(() => ({
    [kind.value === 'variable'
        ? 'data-template-variable'
        : `data-template-${kind.value}`]:
        kind.value === 'variable' ? props.node.attrs.id : props.node.attrs.key,
}));
</script>

<template>
    <NodeViewWrapper
        as="span"
        :class="tokenClass"
        contenteditable="false"
        v-bind="dataAttributes"
    >
        <Tooltip>
            <TooltipTrigger as-child>
                <span class="inline-block max-w-full truncate">
                    {{ label }}
                </span>
            </TooltipTrigger>
            <TooltipContent>{{ label }} · {{ SHEET_MARK_HINTS[mark] }}</TooltipContent>
        </Tooltip>
    </NodeViewWrapper>
</template>

