<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { inlineNodeLabel, inlineNodeName, markClass, SHEET_MARK_HINTS, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import {
    answersOf,
    circled,
    conditionNumbers,
    followUpCandidates,
    isTrigger,
    setShowWhen,
    type ShowWhen,
} from '@/components/domain/configuration/template-table/sheetConditions';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const props = defineProps(nodeViewProps);

// La hoja cambia fuera de esta ficha: el número del grupo se recalcula en cada cambio.
const version = ref(0);
const bump = (): void => { version.value++; };
onMounted(() => props.editor.on('update', bump));
onBeforeUnmount(() => props.editor.off('update', bump));

const kind = computed(() => props.node.type.name);
const key = computed(() => String(props.node.attrs.key ?? ''));
const variableLabel = computed(() => props.extension.options.variableLabel as ((id: string) => string | undefined) | undefined);
const mark = computed(() => sheetMark(kind.value, props.node.attrs));
const showWhen = computed(() => props.node.attrs.showWhen as ShowWhen | null);
const numbers = computed(() => {
    void version.value;

    return conditionNumbers(props.editor.state.doc);
});
const trigger = computed(() => kind.value === 'field' && isTrigger(props.node.attrs));
/** Grupo al que pertenece la ficha: el de su propia pregunta o el de la que depende. */
const group = computed(() => (trigger.value && numbers.value.has(key.value) ? key.value : showWhen.value?.key) ?? null);
const number = computed(() => (group.value ? numbers.value.get(group.value) : undefined));
const label = computed(() => {
    const base = inlineNodeLabel(kind.value, props.node.attrs, variableLabel.value);
    if (number.value) return `${base} ${circled(number.value)}`;

    // Depende de una pregunta de otra parte: se avisa sin número.
    return showWhen.value ? `${base} · condicional` : base;
});
const hint = computed(() => {
    const name = inlineNodeName(kind.value, props.node.attrs, variableLabel.value);
    const base = `${name ? `${name}: ` : ''}${SHEET_MARK_HINTS[mark.value]}`;
    if (showWhen.value) return `${base}; se pide solo si la pregunta ${number.value ? circled(number.value) : 'elegida'} es ${showWhen.value.value}`;

    return base;
});

// Preguntas de seguimiento: solo en la pregunta que se responde (I-159).
const editable = computed(() => trigger.value && props.editor.isEditable);
const candidates = computed(() => {
    void version.value;

    return followUpCandidates(props.editor.state.doc, key.value);
});
const answers = computed(() => {
    void version.value;

    return answersOf(props.editor.state.doc, props.node.attrs);
});
const answer = ref('');
const openFollowUps = (open: boolean): void => {
    if (!open) return;
    bump();
    answer.value = candidates.value.find((item) => item.showWhen?.key === key.value)?.showWhen?.value
        ?? String(props.node.attrs.choice ?? answers.value[0] ?? '');
};
const linked = (candidate: string): boolean =>
    candidates.value.find((item) => item.key === candidate)?.showWhen?.key === key.value;
const toggle = (candidate: string, checked: boolean | 'indeterminate'): void => {
    setShowWhen(props.editor, candidate, checked === true ? { key: key.value, value: answer.value } : null);
    bump();
};
const chooseAnswer = (value: unknown): void => {
    if (typeof value !== 'string') return;
    answer.value = value;
    for (const item of candidates.value.filter((candidate) => linked(candidate.key))) {
        setShowWhen(props.editor, item.key, { key: key.value, value });
    }
    bump();
};
const optionId = (suffix: string): string => `follow-up-${key.value}-${suffix}`;

// Al pasar el mouse, la pregunta y sus preguntas de seguimiento se resaltan juntas.
const highlight = (on: boolean): void => {
    if (!group.value) return;
    props.editor.view.dom
        .querySelectorAll(`[data-condition-group="${CSS.escape(group.value)}"]`)
        .forEach((element) => element.classList.toggle('is-linked', on));
};

const tokenClass = computed(() => markClass[mark.value]);
const dataAttributes = computed(() => ({
    [kind.value === 'variable'
        ? 'data-template-variable'
        : `data-template-${kind.value}`]:
        kind.value === 'variable' ? props.node.attrs.id : props.node.attrs.key,
    'data-condition-group': group.value ?? undefined,
}));
</script>

<template>
    <NodeViewWrapper
        as="span"
        :class="tokenClass"
        contenteditable="false"
        v-bind="dataAttributes"
        @mouseenter="highlight(true)"
        @mouseleave="highlight(false)"
        @focusin="highlight(true)"
        @focusout="highlight(false)"
    >
        <Popover v-if="editable" @update:open="openFollowUps">
            <PopoverTrigger as-child>
                <button type="button" class="inline-block max-w-full cursor-pointer truncate" :aria-label="`${label}: preguntas de seguimiento`" :title="hint">
                    {{ label }}
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" class="w-80">
                <FieldSet class="gap-3">
                    <FieldLegend variant="label">Si responde</FieldLegend>
                    <RadioGroup :model-value="answer" class="flex gap-4" @update:model-value="chooseAnswer">
                        <Field v-for="option in answers" :key="option" orientation="horizontal" class="w-auto">
                            <RadioGroupItem :id="optionId(`answer-${option}`)" :value="option" />
                            <FieldLabel :for="optionId(`answer-${option}`)" class="font-normal">{{ option }}</FieldLabel>
                        </Field>
                    </RadioGroup>
                </FieldSet>
                <FieldSet class="mt-4 gap-3">
                    <FieldLegend variant="label">pedir también:</FieldLegend>
                    <Field v-for="candidate in candidates" :key="candidate.key" orientation="horizontal">
                        <Checkbox
                            :id="optionId(candidate.key)"
                            :model-value="linked(candidate.key)"
                            @update:model-value="toggle(candidate.key, $event)"
                        />
                        <FieldLabel :for="optionId(candidate.key)" class="font-normal">{{ candidate.label }}</FieldLabel>
                    </Field>
                    <FieldDescription>
                        {{ candidates.length ? 'Lo que no marque se pide siempre. Se guarda con la hoja.' : 'Inserte en esta parte las preguntas «Docente» que dependen de esta respuesta.' }}
                    </FieldDescription>
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
