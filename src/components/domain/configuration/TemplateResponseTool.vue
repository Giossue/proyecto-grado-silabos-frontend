<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { ChevronDown, ListChecks } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
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
    type ResponseDisplay, type ResponseOption, type ResponseSettings,
} from '@/lib/responseKinds';
import type { DocumentNode } from '@/lib/templateDocument';

const props = withDefaults(defineProps<{
    editor?: Editor | null;
    allowed?: boolean;
    disabled?: boolean;
    label?: string;
    hint?: string;
    optionsHint?: string;
    requireOptions?: boolean;
}>(), {
    editor: undefined,
    allowed: true,
    disabled: false,
    label: 'Tipo de respuesta',
    hint: 'Quien llena el campo solo responde: no cambia el tipo ni las opciones',
    optionsHint: 'Si las deja vacías, Coordinación las escribe en cada materia',
    requireOptions: false,
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
const missingOptions = computed(() => props.requireOptions && responseHasOptions(kind.value) && options.value.length === 0);
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
watch(open, (value) => {
    if (!value) return;
    const current = selected();
    editing.value = current !== null;
    kind.value = current?.kind || kind.value;
    options.value = current?.options ?? [];
    draft.value = current ? fromSettings(current) : fresh();
    more.value = false;
});
const insert = (): void => {
    if (!ready.value || missingOptions.value || settingsError.value) return;
    const node = emptyResponse(kind.value, options.value, settings.value);
    if (standalone.value) emit('insert', node);
    else props.editor!.chain().focus().insertContent(node).run();
    options.value = [];
    draft.value = fresh();
    open.value = false;
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
            <ChoiceGroup v-model="kind" label="Tipo de respuesta" :options="kinds" />
            <FieldDescription>{{ hint }}</FieldDescription>
          </Field>
          <Field v-if="responseHasOptions(kind)">
            <FieldLabel>Opciones</FieldLabel>
            <ResponseOptionsEditor v-model="options" />
            <FieldDescription>{{ optionsHint }}</FieldDescription>
          </Field>
          <Collapsible v-model:open="more">
            <CollapsibleTrigger as-child>
              <Button type="button" variant="ghost" size="sm" class="w-fit" data-response-more>Más opciones<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FieldGroup class="pt-3">
                <Field orientation="horizontal">
                  <FieldLabel :for="`${id}-required`">Obligatoria</FieldLabel>
                  <Switch :id="`${id}-required`" v-model="draft.required" data-response-required />
                </Field>
                <Field>
                  <FieldLabel :for="`${id}-help`">Ayuda</FieldLabel>
                  <Input :id="`${id}-help`" v-model="draft.help" :maxlength="RESPONSE_HELP_LENGTH" autocomplete="off" placeholder="Se muestra debajo de la respuesta" data-response-help />
                </Field>
                <Field v-if="settingNames.includes('maxLength')">
                  <FieldLabel :for="`${id}-max-length`">Caracteres máximos</FieldLabel>
                  <Input :id="`${id}-max-length`" v-model="draft.maxLength" inputmode="numeric" autocomplete="off" :placeholder="String(RESPONSE_TEXT_LENGTH)" data-response-max-length />
                </Field>
                <Field v-if="settingNames.includes('display')">
                  <FieldLabel>Cómo se muestra</FieldLabel>
                  <ChoiceGroup v-model="draft.display" label="Cómo se muestra" :options="displays" />
                </Field>
                <div v-if="settingNames.includes('minChoices')" class="grid grid-cols-2 gap-2">
                  <Field>
                    <FieldLabel :for="`${id}-min`">Elegir al menos</FieldLabel>
                    <Input :id="`${id}-min`" v-model="draft.minChoices" inputmode="numeric" autocomplete="off" placeholder="1" data-response-min />
                  </Field>
                  <Field>
                    <FieldLabel :for="`${id}-max`">Como máximo</FieldLabel>
                    <Input :id="`${id}-max`" v-model="draft.maxChoices" inputmode="numeric" autocomplete="off" placeholder="Todas" data-response-max />
                  </Field>
                </div>
              </FieldGroup>
            </CollapsibleContent>
          </Collapsible>
          <FieldError v-if="settingsError" data-response-settings-error>{{ settingsError }}</FieldError>
          <Button type="submit" size="sm" class="w-fit" :disabled="missingOptions || Boolean(settingsError)" data-response-insert>{{ editing ? 'Guardar cambios' : 'Insertar' }}</Button>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover></MenuTooltip>
</template>
