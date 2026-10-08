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
    let column = 0;
    for (const cell of cells) {
        cell.dataset.label = names[column] ?? '';
        cell.dataset.cardRole = cell.querySelector('[data-table-actions]') ? 'actions' : 'data';
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
