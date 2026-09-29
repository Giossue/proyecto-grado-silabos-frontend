<script setup lang="ts">
import { Bold, Columns3, Italic, List, ListOrdered, Rows3, Table2, Trash2 } from '@lucide/vue';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { onBeforeUnmount, ref, watch } from 'vue';
import TemplateToolbarButton from '@/components/domain/configuration/TemplateToolbarButton.vue';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { DocumentNode } from '@/lib/templateDocument';

const props = withDefaults(defineProps<{
    id: string;
    label: string;
    modelValue?: DocumentNode | null;
    disabled?: boolean;
}>(), { modelValue: null, disabled: false });

const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();

const version = ref(0);
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
        }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
    ],
    onUpdate: ({ editor: current }) => emit('update:modelValue', current.getJSON() as DocumentNode),
    onTransaction: () => {
        version.value++;
    },
});

watch(() => props.disabled, (disabled) => editor.value?.setEditable(!disabled));
onBeforeUnmount(() => editor.value?.destroy());

const active = (name: string): boolean => {
    void version.value;

    return editor.value?.isActive(name) ?? false;
};
const chain = () => editor.value?.chain().focus();
</script>

<template>
    <div class="free-text-editor flex min-w-0 flex-col rounded-md border bg-background" :data-disabled="disabled || undefined">
        <TooltipProvider v-if="!disabled" :delay-duration="150">
        <div class="flex flex-wrap items-center gap-1 border-b p-1" role="toolbar" :aria-label="`Formato de ${label}`">
            <TemplateToolbarButton label="Negrita" :pressed="active('bold')" :variant="active('bold') ? 'secondary' : 'ghost'" @click="chain()?.toggleBold().run()">
                <Bold aria-hidden="true" />
            </TemplateToolbarButton>
            <TemplateToolbarButton label="Cursiva" :pressed="active('italic')" :variant="active('italic') ? 'secondary' : 'ghost'" @click="chain()?.toggleItalic().run()">
                <Italic aria-hidden="true" />
            </TemplateToolbarButton>
            <Separator orientation="vertical" class="h-6" />
            <TemplateToolbarButton label="Lista con viñetas" :pressed="active('bulletList')" :variant="active('bulletList') ? 'secondary' : 'ghost'" @click="chain()?.toggleBulletList().run()">
                <List aria-hidden="true" />
            </TemplateToolbarButton>
            <TemplateToolbarButton label="Lista numerada" :pressed="active('orderedList')" :variant="active('orderedList') ? 'secondary' : 'ghost'" @click="chain()?.toggleOrderedList().run()">
                <ListOrdered aria-hidden="true" />
            </TemplateToolbarButton>
            <Separator orientation="vertical" class="h-6" />
            <TemplateToolbarButton v-if="!active('table')" label="Insertar tabla" text="Tabla" @click="chain()?.insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()">
                <Table2 aria-hidden="true" />
            </TemplateToolbarButton>
            <template v-else>
                <TemplateToolbarButton label="Agregar fila" text="Fila" @click="chain()?.addRowAfter().run()">
                    <Rows3 aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton label="Agregar columna" text="Columna" @click="chain()?.addColumnAfter().run()">
                    <Columns3 aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton label="Quitar fila" @click="chain()?.deleteRow().run()">
                    <Rows3 class="text-destructive" aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton label="Quitar columna" @click="chain()?.deleteColumn().run()">
                    <Columns3 class="text-destructive" aria-hidden="true" />
                </TemplateToolbarButton>
                <TemplateToolbarButton label="Quitar tabla" @click="chain()?.deleteTable().run()">
                    <Trash2 class="text-destructive" aria-hidden="true" />
                </TemplateToolbarButton>
            </template>
        </div>
        </TooltipProvider>
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
