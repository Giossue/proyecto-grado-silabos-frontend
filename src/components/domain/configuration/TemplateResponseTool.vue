<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { ListChecks } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import ChoiceGroup from '@/components/domain/ChoiceGroup.vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import ResponseOptionsEditor from '@/components/domain/syllabus/ResponseOptionsEditor.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RESPONSE_NODE, emptyResponse, responseAttrs, responseHasOptions, responseKindOptions, type ResponseOption } from '@/lib/responseKinds';

const props = withDefaults(defineProps<{ editor: Editor | null; allowed: boolean; disabled?: boolean }>(), { disabled: false });

const open = ref(false);
const kind = ref(responseKindOptions[0]!.kind);
const options = ref<ResponseOption[]>([]);
const ready = computed(() => !props.disabled && props.allowed && props.editor !== null && !props.editor.isDestroyed && props.editor.isEditable);
const tooltip = computed(() => props.allowed ? 'Tipo de respuesta' : 'Tipo de respuesta: no va en campos Fijos');
const kinds = responseKindOptions.map((item) => ({ value: item.kind, label: item.label }));
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
});
const insert = (): void => {
    if (!ready.value) return;
    props.editor!.chain().focus().insertContent(emptyResponse(kind.value, options.value)).run();
    options.value = [];
    open.value = false;
};
</script>

<template>
  <Popover v-model:open="open">
    <MenuTooltip :label="tooltip">
      <PopoverTrigger as-child>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Tipo de respuesta" :disabled="!ready" @mousedown.prevent><ListChecks aria-hidden="true" /></Button>
      </PopoverTrigger>
    </MenuTooltip>
    <PopoverContent align="start" class="w-80">
      <form @submit.prevent="insert">
        <FieldGroup>
          <Field>
            <FieldLabel>Tipo de respuesta</FieldLabel>
            <ChoiceGroup v-model="kind" label="Tipo de respuesta" :options="kinds" />
            <FieldDescription>Quien llena el campo solo responde: no cambia el tipo ni las opciones</FieldDescription>
          </Field>
          <Field v-if="responseHasOptions(kind)">
            <FieldLabel>Opciones</FieldLabel>
            <ResponseOptionsEditor v-model="options" />
            <FieldDescription>Si las deja vacías, Coordinación las escribe en cada materia</FieldDescription>
          </Field>
          <Button type="submit" size="sm" class="w-fit" data-response-insert>{{ editing ? 'Guardar cambios' : 'Insertar' }}</Button>
        </FieldGroup>
      </form>
    </PopoverContent>
  </Popover>
</template>
