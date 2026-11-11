<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import MenuTooltip from '@/components/domain/MenuTooltip.vue';
import type { ChainedCommands, Editor } from '@tiptap/core';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, ChevronDown, Italic, List, ListOrdered, Redo2, Table2, Underline, Undo2 } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DOCUMENT_CELL_COLORS, DOCUMENT_TEXT_COLORS, paintCell } from '@/lib/documentPalette';
import { cn } from '@/lib/utils';

const props = defineProps<{ editor: Editor | null; disabled?: boolean }>();

const ready = computed(() => !props.disabled && props.editor !== null && !props.editor.isDestroyed && props.editor.isEditable);
const run = (command: (chain: ChainedCommands) => ChainedCommands): void => {
    if (ready.value) command(props.editor!.chain().focus()).run();
};
const active = (name: string, attributes?: Record<string, unknown>): boolean => ready.value && props.editor!.isActive(name, attributes);
const can = (check: (editor: Editor) => boolean): boolean => ready.value && check(props.editor!);
const inTable = computed(() => active('table'));
const returnFocus = (event: Event): void => {
    event.preventDefault();
    if (ready.value) props.editor!.commands.focus();
};

const history = [
    { label: 'Deshacer', icon: Undo2, apply: (chain: ChainedCommands) => chain.undo(), allowed: (editor: Editor) => editor.can().undo() },
    { label: 'Rehacer', icon: Redo2, apply: (chain: ChainedCommands) => chain.redo(), allowed: (editor: Editor) => editor.can().redo() },
] as const;
const marks = [
    { name: 'bold', label: 'Negrita', icon: Bold, toggle: (chain: ChainedCommands) => chain.toggleBold() },
    { name: 'italic', label: 'Cursiva', icon: Italic, toggle: (chain: ChainedCommands) => chain.toggleItalic() },
    { name: 'underline', label: 'Subrayado', icon: Underline, toggle: (chain: ChainedCommands) => chain.toggleUnderline() },
] as const;
const alignments = [
    { value: 'left', label: 'Alinear a la izquierda', icon: AlignLeft },
    { value: 'center', label: 'Centrar', icon: AlignCenter },
    { value: 'right', label: 'Alinear a la derecha', icon: AlignRight },
    { value: 'justify', label: 'Justificar', icon: AlignJustify },
] as const;
const lists = [
    { name: 'bulletList', label: 'Lista con viñetas', icon: List, toggle: (chain: ChainedCommands) => chain.toggleBulletList() },
    { name: 'orderedList', label: 'Lista numerada', icon: ListOrdered, toggle: (chain: ChainedCommands) => chain.toggleOrderedList() },
] as const;
const tableActions = [
    { label: 'Agregar fila debajo', apply: (chain: ChainedCommands) => chain.addRowAfter() },
    { label: 'Quitar fila', apply: (chain: ChainedCommands) => chain.deleteRow() },
    { label: 'Agregar columna a la derecha', apply: (chain: ChainedCommands) => chain.addColumnAfter() },
    { label: 'Quitar columna', apply: (chain: ChainedCommands) => chain.deleteColumn() },
    { label: 'Combinar celdas', apply: (chain: ChainedCommands) => chain.mergeCells(), allowed: (editor: Editor) => editor.can().mergeCells() },
    { label: 'Separar celda', apply: (chain: ChainedCommands) => chain.splitCell(), allowed: (editor: Editor) => editor.can().splitCell() },
    { label: 'Celda de encabezado', apply: (chain: ChainedCommands) => chain.toggleHeaderCell() },
];
</script>

<template>
  <div class="flex shrink-0 items-center gap-0.5" role="group" aria-label="Formato del texto">
    <IconTooltip v-for="step in history" :key="step.label" :label="step.label"><Button type="button" variant="ghost" size="icon-sm" :aria-label="step.label" :disabled="!can(step.allowed)" @mousedown.prevent @click="run(step.apply)"><component :is="step.icon" aria-hidden="true" /></Button></IconTooltip>
    <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <IconTooltip v-for="mark in marks" :key="mark.name" :label="mark.label"><Button type="button" variant="ghost" size="icon-sm" :aria-label="mark.label" :aria-pressed="active(mark.name)" :disabled="!ready" :class="cn(active(mark.name) && 'bg-accent text-accent-foreground')" @mousedown.prevent @click="run(mark.toggle)"><component :is="mark.icon" aria-hidden="true" /></Button></IconTooltip>
    <MenuTooltip label="Color del texto"><DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Color del texto" :disabled="!ready" @mousedown.prevent><Baseline aria-hidden="true" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" @close-auto-focus="returnFocus">
        <DropdownMenuItem v-for="color in DOCUMENT_TEXT_COLORS" :key="color.value" @select="run((chain) => chain.setColor(color.value))"><span class="size-3 shrink-0 rounded-full ring-1 ring-border" :style="{ backgroundColor: color.value }" aria-hidden="true" />{{ color.label }}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu></MenuTooltip>
    <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <IconTooltip v-for="alignment in alignments" :key="alignment.value" :label="alignment.label"><Button type="button" variant="ghost" size="icon-sm" :aria-label="alignment.label" :aria-pressed="active('paragraph', { textAlign: alignment.value })" :disabled="!ready" :class="cn(active('paragraph', { textAlign: alignment.value }) && 'bg-accent text-accent-foreground')" @mousedown.prevent @click="run((chain) => chain.setTextAlign(alignment.value))"><component :is="alignment.icon" aria-hidden="true" /></Button></IconTooltip>
    <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <IconTooltip v-for="list in lists" :key="list.name" :label="list.label"><Button type="button" variant="ghost" size="icon-sm" :aria-label="list.label" :aria-pressed="active(list.name)" :disabled="!ready" :class="cn(active(list.name) && 'bg-accent text-accent-foreground')" @mousedown.prevent @click="run(list.toggle)"><component :is="list.icon" aria-hidden="true" /></Button></IconTooltip>
    <span class="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" variant="ghost" size="sm" aria-label="Tabla" :disabled="!ready" :class="cn(inTable && 'bg-accent text-accent-foreground')"><Table2 data-icon="inline-start" aria-hidden="true" />Tabla<ChevronDown data-icon="inline-end" aria-hidden="true" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" @close-auto-focus="returnFocus">
        <DropdownMenuItem @select="run((chain) => chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }))">Insertar tabla</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem v-for="action in tableActions" :key="action.label" :disabled="!inTable || (action.allowed !== undefined && !can(action.allowed))" @select="run(action.apply)">{{ action.label }}</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger :disabled="!inTable">Fondo de celda</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem v-for="color in DOCUMENT_CELL_COLORS" :key="color.value ?? 'none'" @select="run((chain) => paintCell(chain, color))">{{ color.label }}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem :disabled="!inTable" @select="run((chain) => chain.deleteTable())">Quitar tabla</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
