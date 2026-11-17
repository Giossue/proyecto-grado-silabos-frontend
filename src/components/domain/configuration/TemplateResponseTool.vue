<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { ChevronDown, ListChecks, RotateCcw } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import TemplateConditionPicker from '@/components/domain/configuration/TemplateConditionPicker.vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import ResponseOptionsEditor from '@/components/domain/syllabus/ResponseOptionsEditor.vue';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
    RESPONSE_DISPLAYS, RESPONSE_HELP_LENGTH, RESPONSE_NODE, RESPONSE_TEXT_LENGTH, emptyResponse, responseAttrs, responseHasOptions, responseKindOptions, responseSettingNames,
    responseSettings, sameResponseOptions, type ResponseAttrs, type ResponseDisplay, type ResponseOption, type ResponseSettings,
} from '@/lib/responseKinds';
import { choiceOf, conditionSourceKey, conditionSources, newResponseId, responseIds, type ConditionChoice, type ConditionSource } from '@/lib/responseConditions';
import type { DocumentNode } from '@/lib/templateDocument';

const props = withDefaults(defineProps<{
    editor?: Editor | null;
    allowed?: boolean;
    disabled?: boolean;
    label?: string;
    hint?: string;
    optionsHint?: string;
    requireOptions?: boolean;
    current?: ResponseAttrs | null;
    fixed?: boolean;
    fixedReason?: string;
    templateOptions?: ResponseOption[] | null;
    sources?: ConditionSource[] | null;
    usedIds?: string[];
    claimSource?: ((source: ConditionSource) => string | null) | null;
}>(), {
    editor: undefined,
    allowed: true,
    disabled: false,
    label: 'Tipo de respuesta',
    hint: 'Quien llena el campo solo responde: no cambia el tipo ni las opciones',
    optionsHint: 'Si las deja vacías, Coordinación las escribe en cada materia',
    requireOptions: false,
    current: null,
    fixed: false,
    fixedReason: 'El tipo y Más opciones los fija Administración: aquí solo cambia las opciones',
    templateOptions: null,
    sources: null,
    usedIds: () => [],
    claimSource: null,
});
const emit = defineEmits<{ insert: [node: DocumentNode] }>();

type Draft = { required: boolean; help: string; maxLength: string; minChoices: string; maxChoices: string; display: ResponseDisplay };
const fresh = (): Draft => ({ required: true, help: '', maxLength: '', minChoices: '', maxChoices: '', display: 'lista' });
const fromSettings = (settings: ResponseSettings): Draft => ({
    required: settings.required !== false, help: settings.help ?? '', maxLength: settings.maxLength ? String(settings.maxLength) : '',
    minChoices: settings.minChoices ? String(settings.minChoices) : '', maxChoices: settings.maxChoices ? String(settings.maxChoices) : '', display: settings.display ?? 'lista',
});

const id = useId();
const open = ref(false);
const more = ref(false);
const kind = ref(responseKindOptions[0]!.kind);
const options = ref<ResponseOption[]>([]);
const draft = ref<Draft>(fresh());
const standalone = computed(() => props.editor === undefined);
const ready = computed(() => !props.disabled && props.allowed
    && (standalone.value || (props.editor !== null && props.editor !== undefined && !props.editor.isDestroyed && props.editor.isEditable)));
const tooltip = computed(() => props.allowed ? props.label : `${props.label}: no va en campos Institucionales`);
const kinds = responseKindOptions.map((item) => ({ value: item.kind, label: item.label }));
const displays = RESPONSE_DISPLAYS.map((item) => ({ value: item.value, label: item.label }));
const settingNames = computed(() => responseSettingNames(kind.value));
const missingOptions = computed(() => (props.requireOptions || props.fixed) && responseHasOptions(kind.value) && options.value.length === 0);
const resettable = computed(() => props.fixed && props.templateOptions !== null && !sameResponseOptions(options.value, props.templateOptions));
const plural = (count: number): string => (count === 1 ? '1 opción' : `${count} opciones`);
const whole = (text: string): number | null => /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
const settings = computed<ResponseSettings>(() => ({
    required: draft.value.required,
    help: draft.value.help,
    maxLength: whole(draft.value.maxLength) ?? undefined,
    minChoices: whole(draft.value.minChoices) ?? undefined,
    maxChoices: whole(draft.value.maxChoices) ?? undefined,
    display: draft.value.display,
}));
const inRange = (text: string, max: number): boolean => text.trim() === '' || ((whole(text) ?? 0) >= 1 && (whole(text) ?? 0) <= max);
const settingsError = computed((): string => {
    const names = settingNames.value;
    if (props.fixed) {
        const min = props.current?.minChoices;
        const max = props.current?.maxChoices;
        if (min && min > options.value.length) return `Esta respuesta pide elegir al menos ${min}: deje al menos ${plural(min)}.`;
        if (max && max > options.value.length) return `Esta respuesta permite elegir hasta ${max}: deje al menos ${plural(max)}.`;
        return '';
    }
    if (names.includes('maxLength') && !inRange(draft.value.maxLength, RESPONSE_TEXT_LENGTH)) return `El límite de caracteres va de 1 a ${RESPONSE_TEXT_LENGTH}.`;
    if (names.includes('minChoices') && (draft.value.minChoices.trim() || draft.value.maxChoices.trim())) {
        if (options.value.length === 0) return 'Escriba las opciones antes de fijar cuántas elegir.';
        if (!inRange(draft.value.minChoices, options.value.length) || !inRange(draft.value.maxChoices, options.value.length)) return `Cuántas elegir va de 1 a ${options.value.length}, el número de opciones.`;
        const min = whole(draft.value.minChoices);
        const max = whole(draft.value.maxChoices);
        if (min !== null && max !== null && min > max) return 'El mínimo para elegir no puede superar el máximo.';
    }
    return '';
});
const selected = (): ReturnType<typeof responseAttrs> | null => {
    const node = (props.editor?.state.selection as { node?: { type: { name: string }; attrs: Record<string, unknown> } } | undefined)?.node;
    return node?.type.name === RESPONSE_NODE ? responseAttrs({ type: RESPONSE_NODE, attrs: node.attrs as never }) : null;
};
const editing = ref(false);
const logicId = ref<string | undefined>(undefined);
const condition = ref<ConditionChoice>({ source: '', options: [] });
const anchor = (): number => {
    const selection = props.editor?.state.selection as { from: number; node?: unknown } | undefined;
    return selection?.from ?? 0;
};
const ownSources = (): ConditionSource[] => {
    const editor = props.editor;
    if (!editor || editor.isDestroyed) return [];
    let before = 0;
    editor.state.doc.nodesBetween(0, Math.min(anchor(), editor.state.doc.content.size), (node, position) => {
        if (node.type.name === RESPONSE_NODE && position < anchor()) before += 1;
    });
    return conditionSources([{ id: 'campo', label: 'Este campo', content: editor.getJSON() as DocumentNode }]).filter((source) => source.index < before);
};
const allSources = ref<ConditionSource[]>([]);
const showsCondition = computed(() => props.sources !== null && !props.fixed);
const conditionError = computed(() => showsCondition.value && condition.value.source && condition.value.options.length === 0 ? 'Elija al menos una opción para «Mostrar solo si»' : '');
watch(open, (value) => {
    if (!value) return;
    const current = props.current ?? selected();
    editing.value = current !== null;
    kind.value = current?.kind || kind.value;
    options.value = current?.options ?? [];
    draft.value = current ? fromSettings(current) : fresh();
    logicId.value = current?.id;
    allSources.value = props.sources === null ? [] : [...props.sources, ...ownSources()];
    condition.value = choiceOf(current?.showIf, allSources.value);
    more.value = Boolean(current?.showIf);
});
const claim = (source: ConditionSource): string | null => {
    if (source.id) return source.id;
    const id = newResponseId([...props.usedIds, ...responseIds([props.editor?.getJSON() as DocumentNode])]);
    if (source.field !== 'campo') return props.claimSource?.(source) ?? null;
    const editor = props.editor!;
    let index = -1;
    let at = -1;
    editor.state.doc.descendants((node, position) => {
        if (node.type.name !== RESPONSE_NODE) return;
        index += 1;
        if (index === source.index) at = position;
    });
    if (at < 0) return null;
    editor.view.dispatch(editor.state.tr.setNodeMarkup(at, undefined, { ...editor.state.doc.nodeAt(at)!.attrs, id }));
    return id;
};
const insert = (): void => {
    if (!ready.value || missingOptions.value || settingsError.value || conditionError.value) return;
    const logic: { id?: string; showIf?: { response: string; options: string[] } } = {};
    if (props.fixed && props.current) {
        if (props.current.id) logic.id = props.current.id;
        if (props.current.showIf) logic.showIf = props.current.showIf;
    } else if (showsCondition.value) {
        const used = [...props.usedIds, ...responseIds([props.editor?.getJSON() as DocumentNode])].filter((item) => item !== logicId.value);
        if (responseHasOptions(kind.value)) logic.id = logicId.value ?? newResponseId(used);
        const source = allSources.value.find((item) => conditionSourceKey(item) === condition.value.source);
        const response = source ? claim(source) : null;
        if (source && response) logic.showIf = { response, options: condition.value.options };
    } else {
        if (logicId.value) logic.id = logicId.value;
        if (props.current?.showIf ?? selected()?.showIf) logic.showIf = (props.current?.showIf ?? selected()?.showIf)!;
    }
    const node = emptyResponse(kind.value, options.value, props.fixed && props.current ? responseSettings(kind.value, props.current) : settings.value, logic);
    if (standalone.value) emit('insert', node);
    else props.editor!.chain().focus().insertContent(node).run();
    options.value = [];
    draft.value = fresh();
    open.value = false;
};
const reset = (): void => {
    if (!props.templateOptions) return;
    options.value = props.templateOptions.map((option) => ({ ...option }));
    insert();
};
</script>

<template>
  <MenuTooltip :label="tooltip"><Popover v-model:open="open">
    <PopoverTrigger as-child>
      <Button type="button" variant="ghost" size="icon-sm" :aria-label="label" :disabled="!ready" @mousedown.prevent><ListChecks aria-hidden="true" /></Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="max-h-(--overlay-max-height) w-80 overflow-y-auto">
      <form novalidate @submit.prevent="insert">
        <FieldGroup>
          <Field>
            <FieldLabel>Tipo de respuesta</FieldLabel>
            <ChoiceGroup v-model="kind" label="Tipo de respuesta" :options="kinds" :disabled="fixed" />
            <FieldDescription v-if="fixed" data-response-fixed>{{ fixedReason }}</FieldDescription>
            <FieldDescription v-else>{{ hint }}</FieldDescription>
          </Field>
          <Field v-if="responseHasOptions(kind)">
            <FieldLabel>Opciones</FieldLabel>
            <ResponseOptionsEditor v-model="options" />
            <FieldDescription v-if="!fixed">{{ optionsHint }}</FieldDescription>
          </Field>
          <Collapsible v-model:open="more">
            <CollapsibleTrigger as-child>
              <Button type="button" variant="ghost" size="sm" class="w-fit" data-response-more>Más opciones<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FieldGroup class="pt-3">
                <Field orientation="horizontal">
                  <FieldLabel :for="`${id}-required`">Obligatoria</FieldLabel>
                  <Switch :id="`${id}-required`" v-model="draft.required" :disabled="fixed" data-response-required />
                </Field>
                <Field>
                  <FieldLabel :for="`${id}-help`">Ayuda</FieldLabel>
                  <Input :id="`${id}-help`" v-model="draft.help" :maxlength="RESPONSE_HELP_LENGTH" autocomplete="off" placeholder="Se muestra debajo de la respuesta" :disabled="fixed" data-response-help />
                </Field>
                <Field v-if="settingNames.includes('maxLength')">
                  <FieldLabel :for="`${id}-max-length`">Caracteres máximos</FieldLabel>
                  <Input :id="`${id}-max-length`" v-model="draft.maxLength" inputmode="numeric" autocomplete="off" :placeholder="String(RESPONSE_TEXT_LENGTH)" :disabled="fixed" data-response-max-length />
                </Field>
                <Field v-if="settingNames.includes('display')">
                  <FieldLabel>Cómo se muestra</FieldLabel>
                  <ChoiceGroup v-model="draft.display" label="Cómo se muestra" :options="displays" :disabled="fixed" />
                </Field>
                <div v-if="settingNames.includes('minChoices')" class="grid grid-cols-2 gap-2">
                  <Field>
                    <FieldLabel :for="`${id}-min`">Elegir al menos</FieldLabel>
                    <Input :id="`${id}-min`" v-model="draft.minChoices" inputmode="numeric" autocomplete="off" placeholder="1" :disabled="fixed" data-response-min />
                  </Field>
                  <Field>
                    <FieldLabel :for="`${id}-max`">Como máximo</FieldLabel>
                    <Input :id="`${id}-max`" v-model="draft.maxChoices" inputmode="numeric" autocomplete="off" placeholder="Todas" :disabled="fixed" data-response-max />
                  </Field>
                </div>
              </FieldGroup>
            </CollapsibleContent>
          </Collapsible>
          <TemplateConditionPicker v-if="showsCondition && more" v-model="condition" :sources="allSources" hint="Si queda oculta, se oculta toda su línea" />
          <FieldError v-if="settingsError" data-response-settings-error>{{ settingsError }}</FieldError>
          <FieldError v-if="conditionError" data-response-condition-error>{{ conditionError }}</FieldError>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" size="sm" class="w-fit" :disabled="missingOptions || Boolean(settingsError) || Boolean(conditionError)" data-response-insert>{{ editing ? 'Guardar cambios' : 'Insertar' }}</Button>
            <Button v-if="resettable" type="button" variant="outline" size="sm" class="w-fit" data-response-reset @click="reset"><RotateCcw data-icon="inline-start" aria-hidden="true" />Restablecer opciones de la plantilla</Button>
          </div>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover></MenuTooltip>
</template>
