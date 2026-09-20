<script setup lang="ts">
import { mergeAttributes, Node } from '@tiptap/core';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor, VueNodeViewRenderer } from '@tiptap/vue-3';
import {
    Bold,
    Columns3,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Merge,
    Minus,
    Redo2,
    Rows3,
    Split,
    Strikethrough,
    Table2,
    Trash2,
    Undo2,
} from '@lucide/vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SourceDocument } from '@/api/sources';
import AcademicSourceImageNodeView from '@/components/domain/AcademicSourceImageNodeView.vue';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { sanitizeSourceDocument } from '@/lib/sourceDocument';

const props = defineProps<{ modelValue: SourceDocument; disabled?: boolean; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [document: SourceDocument] }>();
let applyingExternal = false;
const contentError = ref(false);
const initialDocument = sanitizeSourceDocument(props.modelValue);

const sourceImage = Node.create({
    name: 'sourceImage',
    group: 'block',
    atom: true,
    draggable: true,
    addAttributes: () => ({
        objectId: { default: null },
        src: { default: null },
        alt: { default: '' },
        title: { default: '' },
        sourcePage: { default: null },
        sourceOrder: { default: null },
    }),
    parseHTML: () => [{ tag: 'figure[data-source-image]' }],
    renderHTML: ({ HTMLAttributes }) => [
        'figure',
        mergeAttributes(HTMLAttributes, { 'data-source-image': HTMLAttributes.objectId, contenteditable: 'false' }),
        ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt, title: HTMLAttributes.title, loading: 'lazy' }],
        ...(HTMLAttributes.alt ? [['figcaption', {}, HTMLAttributes.alt]] : []),
    ],
    addNodeView: () => VueNodeViewRenderer(AcademicSourceImageNodeView),
});

const editor = useEditor({
    content: initialDocument.document,
    editable: !props.disabled,
    enableContentCheck: true,
    editorProps: {
        attributes: {
            'aria-label': props.label,
            role: 'textbox',
            'aria-multiline': 'true',
            'data-source-document-flow': 'continuous',
            spellcheck: 'true',
        },
    },
    extensions: [
        StarterKit.configure({ trailingNode: false }),
        Table.configure({ resizable: true, cellMinWidth: 48, lastColumnResizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        sourceImage,
    ],
    onUpdate: ({ editor: current }) => {
        if (applyingExternal) return;
        emit('update:modelValue', { schemaVersion: 1, ...(current.getJSON() as Omit<SourceDocument, 'schemaVersion'>) });
    },
    onContentError: () => {
        contentError.value = true;
    },
});

onMounted(() => {
    if (initialDocument.repaired) {
        emit('update:modelValue', initialDocument.document);
    }
});

watch(
    () => props.disabled,
    (disabled) => editor.value?.setEditable(!disabled),
);
watch(
    () => props.modelValue,
    (document) => {
        if (!editor.value) return;
        const sanitized = sanitizeSourceDocument(document);
        contentError.value = false;
        if (sanitized.repaired) {
            emit('update:modelValue', sanitized.document);
        }
        const local = JSON.stringify({ schemaVersion: 1, ...editor.value.getJSON() });
        if (local === JSON.stringify(sanitized.document)) return;
        applyingExternal = true;
        editor.value.commands.setContent(sanitized.document, { emitUpdate: false });
        applyingExternal = false;
    },
    { deep: true },
);

const action = (command: () => boolean): void => {
    if (!props.disabled) command();
};

onBeforeUnmount(() => editor.value?.destroy());
</script>

<template>
    <section class="source-document-editor w-full min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted/30" :aria-label="label">
        <Alert v-if="contentError" variant="destructive" class="m-4 mb-0">
            <AlertDescription>El documento contiene una estructura que no puede mostrarse completa. Vuelva a procesar el PDF o contacte al administrador.</AlertDescription>
        </Alert>
        <TooltipProvider :delay-duration="150">
            <div class="source-document-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b bg-background/95 p-2 backdrop-blur">
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Deshacer" :disabled="disabled || !editor?.can().chain().focus().undo().run()" @click="action(() => editor?.chain().focus().undo().run() ?? false)"><Undo2 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Deshacer</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Rehacer" :disabled="disabled || !editor?.can().chain().focus().redo().run()" @click="action(() => editor?.chain().focus().redo().run() ?? false)"><Redo2 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Rehacer</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" class="mx-1 h-6" />
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Título nivel 2" :data-active="editor?.isActive('heading', { level: 2 })" @click="action(() => editor?.chain().focus().toggleHeading({ level: 2 }).run() ?? false)"><Heading2 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Título nivel 2</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Título nivel 3" :data-active="editor?.isActive('heading', { level: 3 })" @click="action(() => editor?.chain().focus().toggleHeading({ level: 3 }).run() ?? false)"><Heading3 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Título nivel 3</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Negrita" :data-active="editor?.isActive('bold')" @click="action(() => editor?.chain().focus().toggleBold().run() ?? false)"><Bold aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Negrita</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cursiva" :data-active="editor?.isActive('italic')" @click="action(() => editor?.chain().focus().toggleItalic().run() ?? false)"><Italic aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Cursiva</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Tachado" :data-active="editor?.isActive('strike')" @click="action(() => editor?.chain().focus().toggleStrike().run() ?? false)"><Strikethrough aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Tachado</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" class="mx-1 h-6" />
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista con viñetas" @click="action(() => editor?.chain().focus().toggleBulletList().run() ?? false)"><List aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Lista con viñetas</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista numerada" @click="action(() => editor?.chain().focus().toggleOrderedList().run() ?? false)"><ListOrdered aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Lista numerada</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Separador" @click="action(() => editor?.chain().focus().setHorizontalRule().run() ?? false)"><Minus aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Separador</TooltipContent>
                </Tooltip>
                <Separator orientation="vertical" class="mx-1 h-6" />
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Insertar tabla" @click="action(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() ?? false)"><Table2 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Insertar tabla</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Agregar fila" :disabled="disabled || !editor?.isActive('table')" @click="action(() => editor?.chain().focus().addRowAfter().run() ?? false)"><Rows3 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Agregar fila</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Agregar columna" :disabled="disabled || !editor?.isActive('table')" @click="action(() => editor?.chain().focus().addColumnAfter().run() ?? false)"><Columns3 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Agregar columna</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Combinar celdas" :disabled="disabled || !editor?.can().mergeCells()" @click="action(() => editor?.chain().focus().mergeCells().run() ?? false)"><Merge aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Combinar celdas</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Separar celda" :disabled="disabled || !editor?.can().splitCell()" @click="action(() => editor?.chain().focus().splitCell().run() ?? false)"><Split aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Separar celda</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <span class="inline-flex">
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Eliminar tabla" :disabled="disabled || !editor?.isActive('table')" @click="action(() => editor?.chain().focus().deleteTable().run() ?? false)"><Trash2 aria-hidden="true" /></Button>
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar tabla</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
        <div class="source-document-content w-full min-w-0 max-w-full px-4 py-6 sm:px-6">
            <EditorContent :editor="editor" />
        </div>
    </section>
</template>

<style>
.source-document-toolbar [data-active='true'] {
    background: var(--accent);
    color: var(--accent-foreground);
}
.source-document-editor .tiptap {
    min-height: 20rem;
    min-width: 0;
    max-width: 100%;
    outline: none;
    color: var(--foreground);
    overflow-wrap: anywhere;
}
.source-document-editor .tiptap > :first-child { margin-top: 0; }
.source-document-editor .tiptap p { margin: 0 0 0.75rem; }
.source-document-editor .tiptap h1,
.source-document-editor .tiptap h2,
.source-document-editor .tiptap h3 { margin: 1.25rem 0 0.75rem; font-weight: 700; line-height: 1.2; }
.source-document-editor .tiptap h1 { font-size: 1.75rem; }
.source-document-editor .tiptap h2 { font-size: 1.45rem; }
.source-document-editor .tiptap h3 { font-size: 1.2rem; }
.source-document-editor .tiptap ul,
.source-document-editor .tiptap ol {
    margin: 0 0 0.75rem;
    padding-left: 1.5rem;
}
.source-document-editor .tiptap ul { list-style: disc; }
.source-document-editor .tiptap ol { list-style: decimal; }
.source-document-editor .tiptap li { display: list-item; }
.source-document-editor .tableWrapper { width: 100%; min-width: 0; max-width: 100%; overflow-x: auto; margin: 1rem 0; }
.source-document-editor table { width: max-content; min-width: 100%; border-collapse: collapse; table-layout: auto; }
.source-document-editor th,
.source-document-editor td { min-width: 7rem; max-width: 22rem; border: 1px solid var(--border); line-height: 1.35; padding: 0.5rem 0.625rem; vertical-align: top; overflow-wrap: anywhere; }
.source-document-editor th p,
.source-document-editor td p { margin: 0; }
.source-document-editor th { background: var(--muted); font-weight: 700; }
.source-document-editor .selectedCell::after { background: color-mix(in srgb, var(--primary) 12%, transparent); content: ''; inset: 0; pointer-events: none; position: absolute; }
.source-document-editor figure[data-source-image] { margin: 1rem auto; max-width: 100%; text-align: center; }
.source-document-editor figure[data-source-image] img { display: block; height: auto; margin: 0 auto; max-width: 100%; object-fit: contain; }
.source-document-editor figure[data-source-image] figcaption { color: var(--muted-foreground); font-size: 0.85em; margin-top: 0.35rem; }
</style>
