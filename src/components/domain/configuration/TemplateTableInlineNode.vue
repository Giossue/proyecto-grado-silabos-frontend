<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed } from 'vue';
import { inlineNodeLabel, inlineNodeName, markClass, SHEET_MARK_HINTS, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import type { ConditionTrigger } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
const choices = computed(() => [
    { value: ALWAYS, label: 'Siempre' },
    ...triggers.value.flatMap((trigger) => trigger.options.map((option) => ({
        value: `${trigger.key}::${option}`,
        label: `Solo si «${trigger.label}» es ${option}`,
    }))),
]);
const optionId = (index: number): string => `condition-${String(props.node.attrs.key)}-${index}`;
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
                <FieldSet class="gap-3">
                    <FieldLegend variant="label">¿Cuándo se pide?</FieldLegend>
                    <RadioGroup :model-value="selected" class="gap-2" @update:model-value="choose">
                        <Field v-for="(choice, index) in choices" :key="choice.value" orientation="horizontal">
                            <RadioGroupItem :id="optionId(index)" :value="choice.value" />
                            <FieldLabel :for="optionId(index)" class="font-normal">{{ choice.label }}</FieldLabel>
                        </Field>
                    </RadioGroup>
                    <FieldDescription>{{ triggers.length ? 'Se guarda con la hoja.' : 'Inserte antes un «Docente: Sí o No» para usarlo como condición.' }}</FieldDescription>
                </FieldSet>
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
