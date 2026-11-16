<script setup lang="ts">
import type { Editor } from '@tiptap/core';
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import type { TemplateField } from '@/api/template';
import TemplateInlineText from '@/components/domain/configuration/TemplateInlineText.vue';
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';

const props = defineProps<{
    block?: boolean;
    locked: boolean;
    focusOnCreate?: boolean;
    naming?: boolean;
    variables?: TemplateVariable[];
}>();
const field = defineModel<TemplateField>('field', { required: true });
const emit = defineEmits<{ select: [editor: Editor | null]; named: [] }>();

const patch = (changes: Partial<TemplateField>): void => { field.value = { ...field.value, ...changes }; };
const label = computed({ get: () => field.value.label, set: (value: string) => patch({ label: value }) });
const content = computed({ get: () => field.value.content, set: (value: DocumentNode) => patch({ content: value }) });
const editor = shallowRef<{ editor: Editor | null } | null>(null);
const labelInput = ref<{ focus: () => void } | null>(null);
const labelFocused = ref(false);
const showsLabel = computed(() => field.value.label.trim() !== '' || props.naming || labelFocused.value);

onMounted(() => {
    if (props.focusOnCreate) void nextTick(() => editor.value?.editor?.commands.focus('end'));
});
watch(() => props.naming, (naming) => { if (naming) void nextTick(() => labelInput.value?.focus()); });

const leaveLabel = (): void => {
    labelFocused.value = false;
    emit('named');
};
const name = (): string => field.value.label.trim() || 'Campo sin nombre';
const select = (): void => emit('select', editor.value?.editor ?? null);
</script>

<template>
  <div :data-field-editor="field.id" class="flex min-w-0 flex-col gap-1" @focusin="select" @pointerdown="select">
    <div v-if="showsLabel" data-field-label class="flex min-w-0 font-bold">
      <TemplateInlineText
        ref="labelInput"
        v-model="label"
        :maxlength="180"
        placeholder="Nombre del campo"
        :label="`Nombre del campo ${name()}`"
        :disabled="locked || block"
        @focus="labelFocused = true"
        @blur="leaveLabel"
      />
    </div>
    <div data-field-body><FreeTextEditor :id="`field-content-${field.id}`" ref="editor" v-model="content" :label="`Contenido de ${name()}`" :blocks="field.quien_llena === 'institucional' ? 'fill' : 'configure'" :disabled="locked || block" :variables="variables" :toolbar="false" align bare /></div>
  </div>
</template>
