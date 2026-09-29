<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed } from 'vue';
import { inlineNodeLabel, inlineNodeName, markClass, SHEET_MARK_HINTS, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import type { ConditionTrigger } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const props = defineProps(nodeViewProps);
const ALWAYS = '__siempre__';

const kind = computed(() => props.node.type.name);
const variableLabel = computed(() => props.extension.options.variableLabel as ((id: string) => string | undefined) | undefined);
const label = computed(() => inlineNodeLabel(kind.value, props.node.attrs, variableLabel.value));
const mark = computed(() => sheetMark(kind.value, props.node.attrs));
const showWhen = computed(() => props.node.attrs.showWhen as { key: string; value: string } | null);
const triggers = computed(() =>
    ((props.extension.options.conditionTriggers as (() => ConditionTrigger[]) | undefined)?.() ?? [])
        .filter((trigger) => trigger.key !== props.node.attrs.key),
);
const conditionText = computed(() => {
    if (!showWhen.value) return 'se pide siempre';
    const trigger = triggers.value.find((item) => item.key === showWhen.value!.key);

    return `se pide solo si «${trigger?.label ?? showWhen.value.key}» es ${showWhen.value.value}`;
});
const hint = computed(() => {
    const name = inlineNodeName(kind.value, props.node.attrs, variableLabel.value);
    const base = `${name ? `${name}: ` : ''}${SHEET_MARK_HINTS[mark.value]}`;

    return mark.value === 'teacher' || mark.value === 'yesNo' ? `${base}; ${conditionText.value}` : base;
});
// «Pedir solo si…» se define en la ficha: solo para lo que llena el docente (I-158).
const conditional = computed(() => props.editor.isEditable && kind.value === 'field' && !props.node.attrs.choice);
const selected = computed(() => showWhen.value ? `${showWhen.value.key}::${showWhen.value.value}` : ALWAYS);
const choose = (value: unknown): void => {
    if (typeof value !== 'string') return;
    if (value === ALWAYS) {
        props.updateAttributes({ showWhen: null });

        return;
    }
    const [key, answer] = value.split('::');
    props.updateAttributes({ showWhen: { key, value: answer } });
};
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
        <Popover v-if="conditional">
            <PopoverTrigger as-child>
                <button type="button" class="inline-block max-w-full cursor-pointer truncate" :aria-label="`${label}: ${conditionText}`" :title="hint">
                    {{ label }}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-80">
                <Field>
                    <FieldLabel :for="`condition-${node.attrs.key}`">¿Cuándo se pide?</FieldLabel>
                    <Select :model-value="selected" @update:model-value="choose">
                        <SelectTrigger :id="`condition-${node.attrs.key}`" class="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem :value="ALWAYS">Siempre</SelectItem>
                                <template v-for="trigger in triggers" :key="trigger.key">
                                    <SelectItem v-for="option in trigger.options" :key="`${trigger.key}::${option}`" :value="`${trigger.key}::${option}`">
                                        Solo si «{{ trigger.label }}» es {{ option }}
                                    </SelectItem>
                                </template>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <FieldDescription>{{ triggers.length ? 'Se guarda con la hoja.' : 'Inserte antes un «Docente: Sí o No» para usarlo como condición.' }}</FieldDescription>
                </Field>
            </PopoverContent>
        </Popover>
        <Tooltip v-else>
            <TooltipTrigger as-child>
                <span class="inline-block max-w-full truncate">
                    {{ label }}
                </span>
            </TooltipTrigger>
            <TooltipContent>{{ hint }}</TooltipContent>
        </Tooltip>
    </NodeViewWrapper>
</template>
