<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { choiceHint, inlineNodeLabel, inlineNodeName, markClass, SHEET_MARK_HINTS, sheetMark } from '@/components/domain/configuration/template-table/inlineNodeLabel';
import {
    answersOf,
    circled,
    conditionNumbers,
    followUpCandidates,
    isTrigger,
    setShowWhen,
    triggerQuestions,
    type ShowWhen,
} from '@/components/domain/configuration/template-table/sheetConditions';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const props = defineProps(nodeViewProps);

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
const group = computed(() => (trigger.value && numbers.value.has(key.value) ? key.value : showWhen.value?.key) ?? null);
const number = computed(() => (group.value ? numbers.value.get(group.value) : undefined));
const label = computed(() => {
    const base = inlineNodeLabel(kind.value, props.node.attrs, variableLabel.value);
    if (number.value) return `${base} ${circled(number.value)}`;

    return showWhen.value ? `${base} · condicional` : base;
});
const hint = computed(() => {
    const name = inlineNodeName(kind.value, props.node.attrs, variableLabel.value);
    if (kind.value !== 'variable' && props.node.attrs.choice) {
        const base = choiceHint(props.node.attrs);

        return number.value ? `${base} (pregunta ${circled(number.value)})` : base;
    }
    const base = `${name ? `${name}: ` : ''}${SHEET_MARK_HINTS[mark.value]}`;
    if (showWhen.value) return `${base}; se pide solo si la pregunta ${number.value ? circled(number.value) : 'elegida'} es ${showWhen.value.value}`;

    return base;
});

const editable = computed(() => trigger.value && props.editor.isEditable);
const candidates = computed(() => {
    void version.value;

    return followUpCandidates(props.editor.state.doc, key.value);
});
const answers = computed(() => {
    void version.value;

    return answersOf(props.editor.state.doc, props.node.attrs);
});
const fixedAnswer = computed(() => (props.node.attrs.choice ? String(props.node.attrs.choice) : null));
const answer = ref('');
const openFollowUps = (open: boolean): void => {
    if (!open) return;
    bump();
    answer.value = fixedAnswer.value
        ?? candidates.value.find((item) => item.showWhen?.key === key.value)?.showWhen?.value
        ?? String(answers.value[0] ?? '');
};
const linked = (candidate: string): boolean => {
    const condition = candidates.value.find((item) => item.key === candidate)?.showWhen;

    return condition?.key === key.value && (!fixedAnswer.value || condition.value === fixedAnswer.value);
};
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
const optionId = (suffix: string): string =>
    `follow-up-${key.value}${fixedAnswer.value ? `-${fixedAnswer.value}` : ''}-${suffix}`;
const otherAnswer = (candidate: string): string | null => {
    const condition = candidates.value.find((item) => item.key === candidate)?.showWhen;

    return fixedAnswer.value && condition?.key === key.value && condition.value !== fixedAnswer.value ? condition.value : null;
};

const conditionEditable = computed(() => kind.value === 'field' && !props.node.attrs.choice && !trigger.value && props.editor.isEditable);
const questions = computed(() => {
    void version.value;

    return triggerQuestions(props.editor.state.doc, key.value);
});
const conditionMode = computed(() => (showWhen.value ? 'si' : 'siempre'));
const conditionAnswers = computed(() => questions.value.find((item) => item.key === showWhen.value?.key)?.answers ?? []);
const setMode = (value: unknown): void => {
    if (value === 'siempre') {
        setShowWhen(props.editor, key.value, null);
    } else if (value === 'si' && !showWhen.value) {
        const first = questions.value[0];
        if (first) setShowWhen(props.editor, key.value, { key: first.key, value: first.answers[0] ?? '' });
    }
    bump();
};
const setConditionQuestion = (value: unknown): void => {
    const question = questions.value.find((item) => item.key === value);
    if (question) setShowWhen(props.editor, key.value, { key: question.key, value: question.answers[0] ?? '' });
    bump();
};
const setConditionAnswer = (value: unknown): void => {
    if (typeof value === 'string' && showWhen.value) setShowWhen(props.editor, key.value, { key: showWhen.value.key, value });
    bump();
};

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
            <Tooltip>
                <TooltipTrigger as-child>
                    <PopoverTrigger as-child>
                        <Button type="button" variant="document" size="inline" class="truncate" :aria-label="`${label}: preguntas de seguimiento`">{{ label }}</Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{{ hint }}</TooltipContent>
            </Tooltip>
            <PopoverContent align="start" class="w-80">
                <FieldSet v-if="!fixedAnswer" class="mb-4 gap-3">
                    <FieldLegend variant="label">Si responde</FieldLegend>
                    <RadioGroup :model-value="answer" class="flex gap-4" @update:model-value="chooseAnswer">
                        <Field v-for="option in answers" :key="option" orientation="horizontal" class="w-auto">
                            <RadioGroupItem :id="optionId(`answer-${option}`)" :value="option" />
                            <FieldLabel :for="optionId(`answer-${option}`)" class="font-normal">{{ option }}</FieldLabel>
                        </Field>
                    </RadioGroup>
                </FieldSet>
                <FieldSet class="gap-3">
                    <FieldLegend variant="label">{{ fixedAnswer ? `Si marca «${fixedAnswer}», pedir también:` : 'pedir también:' }}</FieldLegend>
                    <Field v-for="candidate in candidates" :key="candidate.key" orientation="horizontal">
                        <Checkbox
                            :id="optionId(candidate.key)"
                            :model-value="linked(candidate.key)"
                            @update:model-value="toggle(candidate.key, $event)"
                        />
                        <FieldLabel :for="optionId(candidate.key)" class="font-normal">
                            {{ candidate.label }}
                            <span v-if="otherAnswer(candidate.key)" class="text-muted-foreground">(ahora con «{{ otherAnswer(candidate.key) }}»)</span>
                        </FieldLabel>
                    </Field>
                    <FieldDescription>
                        {{ candidates.length ? 'Lo que no marque se pide siempre. Se guarda con la hoja.' : 'Inserte en este campo las preguntas «Docente» que dependen de esta respuesta.' }}
                    </FieldDescription>
                </FieldSet>
            </PopoverContent>
        </Popover>
        <Popover v-else-if="conditionEditable">
            <Tooltip>
                <TooltipTrigger as-child>
                    <PopoverTrigger as-child>
                        <Button type="button" variant="document" size="inline" class="truncate" :aria-label="`${label}: cuándo se pide`">{{ label }}</Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{{ hint }}</TooltipContent>
            </Tooltip>
            <PopoverContent align="start" class="w-80">
                <FieldSet class="gap-3">
                    <FieldLegend variant="label">¿Cuándo se le pide al docente?</FieldLegend>
                    <RadioGroup :model-value="conditionMode" class="flex flex-col gap-2" @update:model-value="setMode">
                        <Field orientation="horizontal">
                            <RadioGroupItem :id="`condicion-${key}-siempre`" value="siempre" />
                            <FieldLabel :for="`condicion-${key}-siempre`" class="font-normal">Siempre</FieldLabel>
                        </Field>
                        <Field orientation="horizontal">
                            <RadioGroupItem :id="`condicion-${key}-si`" value="si" :disabled="questions.length === 0" />
                            <FieldLabel :for="`condicion-${key}-si`" class="font-normal">Solo si otra pregunta tiene cierta respuesta</FieldLabel>
                        </Field>
                    </RadioGroup>
                    <template v-if="showWhen">
                        <Field>
                            <FieldLabel>Pregunta</FieldLabel>
                            <Select :model-value="showWhen.key" @update:model-value="setConditionQuestion">
                                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="question in questions" :key="question.key" :value="question.key">{{ question.label }}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field>
                            <FieldLabel>Respuesta</FieldLabel>
                            <Select :model-value="showWhen.value" @update:model-value="setConditionAnswer">
                                <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem v-for="answer in conditionAnswers" :key="answer" :value="answer">{{ answer }}</SelectItem>
                                </SelectContent>
                            </Select>
                        </Field>
                    </template>
                    <FieldDescription v-if="questions.length === 0">Primero inserte en la hoja una pregunta de Sí o No.</FieldDescription>
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
