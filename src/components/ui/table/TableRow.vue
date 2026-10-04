<script setup lang="ts">
import { Eye } from '@lucide/vue';
import { useMediaQuery } from '@vueuse/core';
import type { HTMLAttributes } from 'vue';
import { computed, inject, nextTick, onMounted, onUpdated, ref, useTemplateRef, watch } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { tableSectionKey } from './context';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
    class?: HTMLAttributes['class'];
}>();

const section = inject(tableSectionKey, 'header');

const narrow = useMediaQuery('(max-width: 639px)');

const isCard = computed(() => section === 'body' && narrow.value);

const rowClasses = computed(() =>
    cn(
        'border-b transition-colors',
        section === 'body'
            ? 'odd:bg-card even:bg-muted/50 hover:bg-muted data-[state=selected]:bg-muted'
            : 'data-[state=selected]:bg-muted',
        props.class,
    ),
);

const row = useTemplateRef<HTMLTableRowElement>('row');
const detail = useTemplateRef<HTMLElement>('detail');

const expandable = ref(false);
const open = ref(false);
const title = ref('');

const headings = (node: HTMLElement): string[] =>
    Array.from(
        node
            .closest('table')
            ?.querySelectorAll<HTMLElement>(
                ':scope > thead > tr:last-child > th',
            ) ?? [],
    ).map((head) => head.textContent?.trim() ?? '');

const cellsOf = (node: HTMLElement): HTMLTableCellElement[] =>
    Array.from(
        node.querySelectorAll<HTMLTableCellElement>(':scope > td'),
    ).filter((cell) => !('cardMore' in cell.dataset));

const annotate = (): void => {
    const node = row.value;

    if (node === null || !isCard.value) {
        return;
    }

    const cells = cellsOf(node);
    const names = headings(node);

    if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
        expandable.value = false;

        return;
    }

    const KEPT = 2;
    const hidden = cells.filter(
        (cell, index) =>
            index >= KEPT &&
            cell.querySelector('[data-slot="table-actions"]') === null,
    ).length;

    const foldActions = hidden > 0;

    cells.forEach((cell, index) => {
        cell.dataset.cardIndex = String(index);

        if (cell.querySelector('[data-slot="table-actions"]') !== null) {
            cell.dataset.cardRole = 'actions';
            cell.dataset.cardHidden = foldActions ? 'true' : 'false';

            return;
        }

        cell.dataset.label = names[index] ?? '';
        cell.dataset.cardHidden = index >= KEPT ? 'true' : 'false';
    });

    Array.from(
        node
            .closest('table')
            ?.querySelectorAll<HTMLElement>(
                ':scope > thead > tr:last-child > th',
            ) ?? [],
    ).forEach((head, index) => {
        head.dataset.cardHidden = cells[index]?.dataset.cardHidden ?? 'false';
    });

    expandable.value = hidden > 0;
    title.value = cells[0]?.textContent?.trim() ?? '';
};

const annotateDetail = (): void => {
    const node = detail.value;

    if (node === null || row.value === null) {
        return;
    }

    const names = headings(row.value);

    cellsOf(node).forEach((cell, index) => {
        cell.dataset.cardIndex = String(index);
        cell.dataset.cardHidden = 'false';

        if (cell.querySelector('[data-slot="table-actions"]') !== null) {
            cell.dataset.cardRole = 'actions';

            return;
        }

        cell.dataset.label = names[index] ?? '';
    });
};

onMounted(() => {
    void nextTick(annotate);
});

onUpdated(annotate);

watch(open, (isOpen) => {
    if (isOpen) {
        void nextTick(annotateDetail);
    }
});
</script>

<template>
    <tr
        ref="row"
        v-bind="$attrs"
        data-slot="table-row"
        :class="rowClasses"
    >
        <slot />

        <td v-if="isCard && expandable" data-card-more class="p-1">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                class="whitespace-nowrap"
                @click="open = true"
            >
                Ver más
                <Eye aria-hidden="true" />
            </Button>
        </td>
    </tr>

    <Sheet v-if="isCard && expandable" v-model:open="open">
        <SheetContent
            side="bottom"
            class="max-h-[85vh] gap-0 overflow-y-auto rounded-t-xl px-5 pt-5 pb-[calc(2rem+env(safe-area-inset-bottom))]"
        >
            <SheetHeader class="p-0 pr-8 pb-1">
                <SheetTitle class="text-left">{{ title }}</SheetTitle>
                <SheetDescription class="sr-only">
                    Todos los datos de la fila y sus acciones.
                </SheetDescription>
            </SheetHeader>
            <div ref="detail" data-card-detail class="text-sm">
                <slot />
            </div>
        </SheetContent>
    </Sheet>
</template>

