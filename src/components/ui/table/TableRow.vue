<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { computed, inject, nextTick, onMounted, onUpdated, useTemplateRef } from 'vue';
import { cn } from '@/lib/utils';
import { tableSectionKey } from './context';

const props = defineProps<{ class?: HTMLAttributes['class'] }>();
const section = inject(tableSectionKey, 'header');
const row = useTemplateRef<HTMLTableRowElement>('row');
const rowClasses = computed(() => cn(
    'border-b transition-colors',
    section === 'body'
        ? 'odd:bg-card even:bg-muted/50 hover:bg-muted data-[state=selected]:bg-muted'
        : 'data-[state=selected]:bg-muted',
    props.class,
));

const annotate = (): void => {
    const node = row.value;
    if (!node || section !== 'body') return;
    const table = node.closest('table');
    if (table?.dataset.cards !== 'true') return;
    const names = Array.from(table.querySelectorAll(':scope > thead > tr:last-child > th'))
        .map((head) => head.textContent?.trim() ?? '');
    const cells = Array.from(node.children).filter((cell): cell is HTMLTableCellElement =>
        cell instanceof HTMLTableCellElement,
    );
    node.dataset.cardEmpty = String(cells.length === 1 && cells[0].colSpan > 1);
    // En móvil la fila es una tarjeta: la primera columna con contenido hace de título (sin etiqueta),
    // la casilla de selección va en la esquina y los datos cortos se reparten en dos columnas.
    let titled = false;
    let column = 0;
    for (const cell of cells) {
        const name = names[column] ?? '';
        const text = cell.textContent?.trim() ?? '';
        const isActions = cell.querySelector('[data-table-actions]') !== null;
        const isSelect = !isActions && name === '' && cell.querySelector('[role="checkbox"], input[type="checkbox"]') !== null;
        let role = 'data';
        if (isActions) role = 'actions';
        else if (isSelect) role = 'select';
        else if (!titled && text !== '' && !['Fila', '#'].includes(name) && cell.colSpan === 1) {
            role = 'title';
            titled = true;
        }
        cell.dataset.label = role === 'data' ? name : '';
        cell.dataset.cardRole = role;
        const wide = text.length > 22 || cell.querySelector('input, select, textarea, [role="combobox"], table') !== null || cell.dataset.cardSpan === 'full';
        cell.dataset.cardWide = String(role === 'data' && wide);
        column += cell.colSpan;
    }
};

onMounted(() => { void nextTick(annotate); });
onUpdated(annotate);
</script>

<template>
    <tr ref="row" data-slot="table-row" role="row" :class="rowClasses">
        <slot />
    </tr>
</template>
