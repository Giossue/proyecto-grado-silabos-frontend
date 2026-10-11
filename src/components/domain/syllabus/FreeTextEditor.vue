<script setup lang="ts">
import { Table, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { Extension, type Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Bold, Braces, Italic, Underline, List, ListOrdered, Table2 } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DocumentVariable, DocumentTableCell, DocumentTableHeader } from '@/components/domain/syllabus/fieldDocumentExtensions';
import type { DocumentNode, TemplateVariable } from '@/lib/templateDocument';
import { pageSpacersPlugin } from '@/lib/editorPageSpacers';
import { emptyDocument } from '@/types/configuration';

const PageSpacers = Extension.create({ name: 'pageSpacers', addProseMirrorPlugins: () => [pageSpacersPlugin()] });
import { DOCUMENT_CELL_COLORS } from '@/lib/documentPalette';

const props = withDefaults(defineProps<{
    id: string;
    label: string;
    modelValue?: DocumentNode | null;
    disabled?: boolean;
    variables?: TemplateVariable[];
    bare?: boolean;
    toolbar?: boolean;
}>(), { modelValue: null, disabled: false, variables: () => [], bare: false, toolbar: true });
const emit = defineEmits<{ 'update:modelValue': [value: DocumentNode] }>();
const slash = ref({ open: false, left: 0, top: 0, query: '', index: 0 });
const slashItems = computed(() => props.variables.filter((item) => item.label.toLowerCase().includes(slash.value.query.toLowerCase())).slice(0, 8));
const closeSlash = (): void => { slash.value.open = false; };
const refreshSlash = (current: Editor): void => {
    const { state, view } = current;
    const { $from, empty } = state.selection;
    const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');
    const match = /(?:^|\s)\/([\p{L}\p{N}_ ]{0,24})$/u.exec(before);
    if (!empty || !match || props.disabled || props.variables.length === 0) {
        closeSlash();
        return;
    }
    const coords = view.coordsAtPos($from.pos);
    const query = match[1] ?? '';
    slash.value = { open: true, left: coords.left, top: coords.bottom + 4, query, index: query === slash.value.query ? slash.value.index : 0 };
};
const chooseSlash = (key: string): void => {
    const variable = props.variables.find((item) => item.key === key);
    const current = editor.value;
    if (!variable || !current) return;
    const to = current.state.selection.from;
    current.chain().focus().deleteRange({ from: to - slash.value.query.length - 1, to }).insertContent({ type: 'variable', attrs: { id: variable.key, label: variable.label } }).run();
    closeSlash();
};
const onSlashKey = (event: KeyboardEvent): boolean => {
    if (!slash.value.open || slashItems.value.length === 0) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        slash.value.index = (slash.value.index + step + slashItems.value.length) % slashItems.value.length;
        return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
        chooseSlash(slashItems.value[slash.value.index]!.key);
        return true;
    }
    if (event.key === 'Escape') {
        closeSlash();
        return true;
    }
    return false;
};
const editor = useEditor({
    content: props.modelValue ?? emptyDocument(),
    editable: !props.disabled,
    editorProps: { handleKeyDown: (_view, event) => onSlashKey(event), attributes: { id: props.id, 'aria-label': props.label, role: 'textbox', 'aria-multiline': 'true', class: 'free-text-editor__content' } },
    extensions: [
        StarterKit.configure({ heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, link: false, strike: false }),
        Table.configure({ resizable: false }), TableRow, DocumentTableHeader, DocumentTableCell,
        PageSpacers,
        DocumentVariable.configure({ labels: Object.fromEntries(props.variables.map((item) => [item.key, item.label])) }),
    ],
    onUpdate: ({ editor: current }) => {
        emit('update:modelValue', current.getJSON() as DocumentNode);
        refreshSlash(current);
    },
    onSelectionUpdate: ({ editor: current }) => refreshSlash(current),
    onBlur: () => closeSlash(),
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
  <div :class="['free-text-editor flex min-w-0 flex-col', bare ? 'bg-transparent' : 'rounded-md border bg-background']" :data-disabled="disabled || undefined">
    <div v-if="editor && toolbar" role="toolbar" :aria-label="`Formato de ${label}`" class="flex flex-wrap items-center gap-1 border-b p-1.5">
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Negrita" :aria-pressed="editor.isActive('bold')" :disabled="disabled" @click="editor.chain().focus().toggleBold().run()"><Bold aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Cursiva" :aria-pressed="editor.isActive('italic')" :disabled="disabled" @click="editor.chain().focus().toggleItalic().run()"><Italic aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Subrayado" :aria-pressed="editor.isActive('underline')" :disabled="disabled" @click="editor.chain().focus().toggleUnderline().run()"><Underline aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista con viñetas" :aria-pressed="editor.isActive('bulletList')" :disabled="disabled" @click="editor.chain().focus().toggleBulletList().run()"><List aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Lista numerada" :aria-pressed="editor.isActive('orderedList')" :disabled="disabled" @click="editor.chain().focus().toggleOrderedList().run()"><ListOrdered aria-hidden="true" /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Insertar tabla" :disabled="disabled" @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"><Table2 aria-hidden="true" /></Button>
      <DropdownMenu v-if="editor.isActive('table')">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="sm" aria-label="Opciones de tabla" :disabled="disabled">Tabla</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @select="editor?.chain().focus().addRowAfter().run()">Agregar fila</DropdownMenuItem>
          <DropdownMenuItem @select="editor?.chain().focus().deleteRow().run()">Quitar fila</DropdownMenuItem>
          <DropdownMenuItem @select="editor?.chain().focus().addColumnAfter().run()">Agregar columna</DropdownMenuItem>
          <DropdownMenuItem @select="editor?.chain().focus().deleteColumn().run()">Quitar columna</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem :disabled="!editor.can().mergeCells()" @select="editor?.chain().focus().mergeCells().run()">Combinar celdas</DropdownMenuItem>
          <DropdownMenuItem :disabled="!editor.can().splitCell()" @select="editor?.chain().focus().splitCell().run()">Separar celdas</DropdownMenuItem>
          <DropdownMenuItem @select="editor?.chain().focus().toggleHeaderCell().run()">Encabezado</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Fondo de celda</DropdownMenuLabel>
          <DropdownMenuItem v-for="color in DOCUMENT_CELL_COLORS" :key="color.value ?? 'none'" @select="editor?.chain().focus().setCellAttribute('backgroundColor', color.value ?? null).run()">{{ color.label }}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="editor?.chain().focus().deleteTable().run()">Quitar tabla</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DropdownMenu v-if="variables.length">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Insertar dato del sistema" :disabled="disabled"><Braces aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="max-h-72 overflow-y-auto">
          <DropdownMenuLabel>Datos del sistema</DropdownMenuLabel>
          <DropdownMenuItem v-for="variable in variables" :key="variable.key" @select="insertVariable(variable.key)">{{ variable.label }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <EditorContent :editor="editor" :class="['overflow-x-auto text-sm', bare ? 'min-h-8 px-1 py-1' : 'min-h-32 px-3 py-2']" />
    <div v-if="slash.open && slashItems.length" role="listbox" aria-label="Datos del sistema" class="fixed z-50 flex min-w-48 flex-col rounded-md border bg-popover p-1 text-sm shadow-menu" :style="{ left: `${slash.left}px`, top: `${slash.top}px` }">
      <Button v-for="(item, position) in slashItems" :key="item.key" type="button" variant="ghost" size="sm" role="option" :aria-selected="position === slash.index" :class="['justify-start', position === slash.index ? 'bg-accent text-accent-foreground' : '']" @mousedown.prevent="chooseSlash(item.key)">{{ item.label }}</Button>
    </div>
  </div>
</template>

<style>
.free-text-editor .free-text-editor__content {
    min-height: 2rem;
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
