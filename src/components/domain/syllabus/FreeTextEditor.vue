<script setup lang="ts">
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { onBeforeUnmount, watch } from 'vue';
import type { DocumentNode } from '@/lib/templateDocument';

const props = withDefaults(defineProps<{
    id: string;
    label: string;
    modelValue?: DocumentNode | null;
    disabled?: boolean;
    /** Solo lista con viñetas (se escribe «- » o «* »): sin negrita, cursiva, lista numerada ni tablas. Sin barra de herramientas. */
    bulletsOnly?: boolean;
}>(), { modelValue: null, disabled: false, bulletsOnly: true });

const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();

const editor = useEditor({
    content: props.modelValue ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    editable: !props.disabled,
    editorProps: {
        attributes: {
            id: props.id,
            'aria-label': props.label,
            role: 'textbox',
            'aria-multiline': 'true',
            class: 'free-text-editor__content',
        },
    },
    extensions: [
        StarterKit.configure({
            heading: false,
            blockquote: false,
            code: false,
            codeBlock: false,
            horizontalRule: false,
            link: false,
            strike: false,
            underline: false,
            ...(props.bulletsOnly ? { bold: false, italic: false, orderedList: false } : {}),
        }),
        ...(props.bulletsOnly ? [] : [Table.configure({ resizable: false }), TableRow, TableHeader, TableCell]),
    ],
    onUpdate: ({ editor: current }) => emit('update:modelValue', current.getJSON() as DocumentNode),
});

watch(() => props.disabled, (disabled) => editor.value?.setEditable(!disabled));
onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
    <div class="free-text-editor flex min-w-0 flex-col rounded-md border bg-background" :data-disabled="disabled || undefined">
        <EditorContent :editor="editor" class="min-h-32 px-3 py-2 text-sm" />
    </div>
</template>

<style>
.free-text-editor .free-text-editor__content {
    min-height: 7rem;
    outline: none;
}
.free-text-editor .free-text-editor__content p {
    margin: 0 0 0.5rem;
}
.free-text-editor .free-text-editor__content ul {
    list-style: disc;
    padding-left: 1.25rem;
}
.free-text-editor .free-text-editor__content ol {
    list-style: decimal;
    padding-left: 1.25rem;
}
.free-text-editor .free-text-editor__content table {
    border-collapse: collapse;
    margin: 0.5rem 0;
    table-layout: fixed;
    width: 100%;
}
.free-text-editor .free-text-editor__content td,
.free-text-editor .free-text-editor__content th {
    border: 1px solid var(--border);
    padding: 0.25rem 0.5rem;
    vertical-align: top;
}
.free-text-editor .free-text-editor__content th {
    background: var(--muted);
    font-weight: 600;
}
.free-text-editor .free-text-editor__content td p,
.free-text-editor .free-text-editor__content th p {
    margin: 0;
}
</style>
