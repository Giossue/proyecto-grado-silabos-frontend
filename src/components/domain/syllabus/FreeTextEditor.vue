<script setup lang="ts">
import { Table, TableRow } from '@tiptap/extension-table';
import StarterKit from '@tiptap/starter-kit';
import { Extension, type Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { Bold, Braces, ChevronDown, Italic, Underline, List, ListOrdered, Table2 } from '@lucide/vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DocumentBlock, DocumentWithBlocks, DocumentVariable, DocumentTableCell, DocumentTableHeader } from '@/components/domain/syllabus/fieldDocumentExtensions';
import { BLOCK_KINDS, newBlock, type DocumentNode, type TemplateVariable } from '@/lib/templateDocument';
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
    blocks?: 'configure' | 'fill';
}>(), { modelValue: null, disabled: false, variables: () => [], bare: false, toolbar: true, blocks: 'fill' });
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
    editorProps: { handleKeyDown: (_view, event) => onSlashKey(event), handleDrop: () => true, handleDOMEvents: { dragstart: (_view, event) => { event.preventDefault(); return true; } }, attributes: { id: props.id, 'aria-label': props.label, role: 'textbox', 'aria-multiline': 'true', class: 'free-text-editor__content' } },
    extensions: [
        StarterKit.configure({ document: false, heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, link: false, strike: false }),
        Table.configure({ resizable: false }), TableRow, DocumentTableHeader, DocumentTableCell,
        DocumentWithBlocks,
        PageSpacers,
        DocumentBlock.configure({ mode: props.blocks }),
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
      <template v-if="editor.isActive('table')">
        <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().addRowAfter().run()">+ Fila</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().deleteRow().run()">− Fila</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().addColumnAfter().run()">+ Columna</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().deleteColumn().run()">− Columna</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled || !editor.can().mergeCells()" @click="editor.chain().focus().mergeCells().run()">Combinar</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled || !editor.can().splitCell()" @click="editor.chain().focus().splitCell().run()">Separar</Button>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().toggleHeaderCell().run()">Encabezado</Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="ghost" size="sm" aria-label="Fondo de celda" :disabled="disabled">Fondo<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem v-for="color in DOCUMENT_CELL_COLORS" :key="color.value ?? 'none'" @select="editor?.chain().focus().setCellAttribute('backgroundColor', color.value ?? null).run()">{{ color.label }}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" @click="editor.chain().focus().deleteTable().run()">Quitar tabla</Button>
        <span class="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
      </template>
      <DropdownMenu v-if="blocks === 'configure'">
        <DropdownMenuTrigger as-child>
          <Button type="button" variant="ghost" size="sm" aria-label="Insertar bloque" :disabled="disabled">Bloque<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem v-for="item in BLOCK_KINDS" :key="item.kind" @select="editor?.chain().focus().insertContent([newBlock(item.kind), { type: 'paragraph' }]).run()">{{ item.label }}</DropdownMenuItem>
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
