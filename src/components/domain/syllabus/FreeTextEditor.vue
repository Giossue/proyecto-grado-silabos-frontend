<script setup lang="ts">
import { Table, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Bold, Italic, Underline, List, ListOrdered, Table2, Undo2, Redo2 } from '@lucide/vue';
import { onBeforeUnmount, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DocumentVariable, DocumentTableCell, DocumentTableHeader } from '@/components/domain/syllabus/fieldDocumentExtensions';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import { emptyDocument } from '@/types/configuration';
import { DOCUMENT_CELL_COLORS } from '@/lib/documentPalette';

const props = withDefaults(defineProps<{
    id: string;
    label: string;
    modelValue?: DocumentNode | null;
    disabled?: boolean;
    variables?: TemplateVariable[];
}>(), { modelValue: null, disabled: false, variables: () => [] });
const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();
const editor = useEditor({
    content: props.modelValue ?? emptyDocument(),
    editable: !props.disabled,
    editorProps: { attributes: { id: props.id, 'aria-label': props.label, role: 'textbox', 'aria-multiline': 'true', class: 'free-text-editor__content' } },
    extensions: [
        StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, link: false, strike: false }),
        Table.configure({ resizable: false }), TableRow, DocumentTableHeader, DocumentTableCell,
        DocumentVariable.configure({ labels: Object.fromEntries(props.variables.map((item) => [item.key, item.label])) }),
    ],
    onUpdate: ({ editor: current }) => emit('update:modelValue', current.getJSON() as DocumentNode),
});
const insertVariable = (key: unknown): void => {
    const variable = props.variables.find((item) => item.key === key);
    if (!variable || props.disabled) return;
    editor.value?.chain().focus().insertContent({ type: 'variable', attrs: { id: variable.key, label: variable.label } }).run();
};
watch(() => props.disabled, (disabled) => editor.value?.setEditable(!disabled));
watch(() => props.modelValue, (value) => {
    if (editor.value && JSON.stringify(value ?? emptyDocument()) !== JSON.stringify(editor.value.getJSON())) {
        editor.value.commands.setContent(value ?? emptyDocument(), { emitUpdate: false });
    }
}, { deep: true });
onBeforeUnmount(() => editor.value?.destroy());
defineExpose({ editor });
</script>

<template>
  <div class="free-text-editor flex min-w-0 flex-col rounded-md border bg-background" :data-disabled="disabled || undefined">
    <div v-if="editor" role="toolbar" :aria-label="`Formato de ${label}`" class="flex flex-wrap items-center gap-1 border-b p-1.5">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Negrita" :aria-pressed="editor.isActive('bold')" :disabled="disabled" @click="editor.chain().focus().toggleBold().run()"><Bold aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Cursiva" :aria-pressed="editor.isActive('italic')" :disabled="disabled" @click="editor.chain().focus().toggleItalic().run()"><Italic aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Subrayado" :aria-pressed="editor.isActive('underline')" :disabled="disabled" @click="editor.chain().focus().toggleUnderline().run()"><Underline aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista con viñetas" :aria-pressed="editor.isActive('bulletList')" :disabled="disabled" @click="editor.chain().focus().toggleBulletList().run()"><List aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista numerada" :aria-pressed="editor.isActive('orderedList')" :disabled="disabled" @click="editor.chain().focus().toggleOrderedList().run()"><ListOrdered aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Insertar tabla" :disabled="disabled" @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"><Table2 aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Deshacer" :disabled="disabled || !editor.can().undo()" @click="editor.chain().focus().undo().run()"><Undo2 aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Rehacer" :disabled="disabled || !editor.can().redo()" @click="editor.chain().focus().redo().run()"><Redo2 aria-hidden="true" /></Button>
      <Select v-if="variables.length" :disabled="disabled" @update:model-value="insertVariable">
        <SelectTrigger class="h-8 w-44" aria-label="Insertar dato del sistema"><SelectValue placeholder="Dato del sistema" /></SelectTrigger>
        <SelectContent><SelectItem v-for="variable in variables" :key="variable.key" :value="variable.key">{{ variable.label }}</SelectItem></SelectContent>
      </Select>
    </div>
    <div v-if="editor?.isActive('table')" class="flex flex-wrap items-center gap-1 border-b p-1.5" aria-label="Opciones de tabla">
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().addRowAfter().run()">Agregar fila</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().deleteRow().run()">Quitar fila</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().addColumnAfter().run()">Agregar columna</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().deleteColumn().run()">Quitar columna</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled || !editor.can().mergeCells()" @click="editor?.chain().focus().mergeCells().run()">Combinar celdas</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled || !editor.can().splitCell()" @click="editor?.chain().focus().splitCell().run()">Separar celdas</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().toggleHeaderCell().run()">Encabezado</Button>
      <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor?.chain().focus().deleteTable().run()">Quitar tabla</Button>
      <Select :disabled="disabled" @update:model-value="editor?.chain().focus().setCellAttribute('backgroundColor', $event === 'none' ? null : $event).run()">
        <SelectTrigger class="h-8 w-36" aria-label="Fondo de celda"><SelectValue placeholder="Fondo de celda" /></SelectTrigger>
        <SelectContent><SelectItem v-for="color in DOCUMENT_CELL_COLORS" :key="color.value ?? 'none'" :value="color.value ?? 'none'">{{ color.label }}</SelectItem></SelectContent>
      </Select>
    </div>
    <EditorContent :editor="editor" class="min-h-32 overflow-x-auto px-3 py-2 text-sm" />
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
    border: 1px solid var(--document-table-border);
    padding: 0.25rem 0.5rem;
    vertical-align: top;
}
.free-text-editor .free-text-editor__content th {
    background: var(--muted);
    font-weight: 600;
}
.free-text-editor .ProseMirror-hideselection *::selection {
    background: transparent;
    color: inherit;
}
.free-text-editor .free-text-editor__content .selectedCell {
    background-color: var(--accent);
}
.free-text-editor .free-text-editor__content td p,
.free-text-editor .free-text-editor__content th p {
    margin: 0;
}
.free-text-editor .document-variable { border-radius: 0.25rem; background: var(--muted); color: var(--foreground); padding: 0.1rem 0.25rem; }
</style>
