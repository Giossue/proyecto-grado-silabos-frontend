import type { Editor } from '@tiptap/vue-3';
import { onBeforeUnmount, ref } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import type { DocumentNode } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';
import {
    cellBoundaryPosition,
    resizeCellBoundary,
} from '@/lib/wordTableResize';

type ResizeGuide = {
    left: number;
    top: number;
    height: number;
};
type CellResizeSession = {
    table: DocumentNode;
    tablePosition: number;
    tableSize: number;
    row: number;
    cell: number;
    widths: number[];
    tableLeft: number;
    minimumX: number;
    maximumX: number;
    currentX: number;
    pointerStartX: number;
    boundaryStartX: number;
    guideStartX: number;
    rowTop: number;
    rowHeight: number;
    previewed: boolean;
};

export function useTableCellResize(
    editor: ShallowRef<Editor | undefined>,
    editorShell: Ref<HTMLElement | null>,
    pending: () => boolean,
) {
    const resizeGuide = ref<ResizeGuide | null>(null);
    let resizeSession: CellResizeSession | null = null;
    let resizeFrame = 0;

    const clearCellResize = (): void => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
        window.removeEventListener('mousemove', moveCellResize, true);
        window.removeEventListener('mouseup', finishCellResize, true);
        resizeSession = null;
        resizeGuide.value = null;
    };

    const replaceResizeTable = (
        session: CellResizeSession,
        document: DocumentNode,
        addToHistory: boolean,
    ): boolean => {
        const current = editor.value;

        if (!current) {
            return false;
        }

        const state = current.view.state;
        const table = state.doc.nodeAt(session.tablePosition);

        if (!table || table.nodeSize !== session.tableSize) {
            return false;
        }

        if (JSON.stringify(table.toJSON()) === JSON.stringify(document)) {
            return true;
        }

        const replacement = state.schema.nodeFromJSON(document);
        const transaction = state.tr.replaceWith(
            session.tablePosition,
            session.tablePosition + session.tableSize,
            replacement,
        );

        if (!addToHistory) {
            transaction.setMeta('addToHistory', false);
        }

        current.view.dispatch(transaction);

        return true;
    };

    const previewCellResize = (): void => {
        const session = resizeSession;

        if (!session) {
            return;
        }

        const result = resizeCellBoundary(
            session.table,
            session.widths,
            session.row,
            session.cell,
            session.currentX - session.tableLeft,
        );

        if ('error' in result) {
            return;
        }

        if (replaceResizeTable(session, result.table, false)) {
            session.previewed = true;
        }
    };

    const moveCellResize = (event: MouseEvent): void => {
        const session = resizeSession;
        const shell = editorShell.value;

        if (!session || !shell) {
            return;
        }

        const requested =
            session.boundaryStartX + event.clientX - session.pointerStartX;
        session.currentX = Math.min(
            session.maximumX,
            Math.max(session.minimumX, requested),
        );
        resizeGuide.value = {
            left:
                session.guideStartX +
                session.currentX -
                session.boundaryStartX -
                shell.getBoundingClientRect().left,
            top: session.rowTop,
            height: session.rowHeight,
        };
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = 0;
            previewCellResize();
        });
    };

    const finishCellResize = (event: MouseEvent): void => {
        const session = resizeSession;
        const current = editor.value;

        if (!session || !current) {
            clearCellResize();

            return;
        }

        moveCellResize(event);
        cancelAnimationFrame(resizeFrame);
        resizeFrame = 0;
        const result = resizeCellBoundary(
            session.table,
            session.widths,
            session.row,
            session.cell,
            session.currentX - session.tableLeft,
        );

        if (
            session.previewed &&
            !replaceResizeTable(session, session.table, false)
        ) {
            clearCellResize();
            toast.error('La tabla cambió mientras se ajustaba la celda.');

            return;
        }

        if ('error' in result) {
            clearCellResize();
            toast.error(result.error);

            return;
        }

        if (!result.changed) {
            clearCellResize();

            return;
        }

        if (!replaceResizeTable(session, result.table, true)) {
            clearCellResize();
            toast.error('La tabla cambió mientras se ajustaba la celda.');

            return;
        }

        clearCellResize();
        current.view.focus();
    };

    const startCellResize = (event: MouseEvent): void => {
        const target = event.target;

        if (pending() || !(target instanceof Element) || event.button !== 0) {
            return;
        }

        const cell = target.closest('td, th');
        const row = cell?.parentElement;
        const table = cell?.closest('table');
        const adjacent = cell?.nextElementSibling;
        const shell = editorShell.value;
        const current = editor.value;

        if (
            !(cell instanceof HTMLTableCellElement) ||
            !(row instanceof HTMLTableRowElement) ||
            !(table instanceof HTMLTableElement) ||
            !(adjacent instanceof HTMLTableCellElement) ||
            !shell ||
            !current
        ) {
            return;
        }

        const cellRect = cell.getBoundingClientRect();

        if (Math.abs(cellRect.right - event.clientX) > 6) {
            return;
        }

        const view = current.view;
        const position = view.posAtDOM(cell, 0);
        const resolved = view.state.doc.resolve(position);
        let tableDepth = -1;

        for (let depth = resolved.depth; depth > 0; depth--) {
            if (resolved.node(depth).type.name === 'table') {
                tableDepth = depth;
                break;
            }
        }

        if (tableDepth < 1) {
            return;
        }

        const tableNode = resolved.node(tableDepth);
        const tablePosition = resolved.before(tableDepth);
        const columns = Array.from(
            table.querySelectorAll(':scope > colgroup > col'),
        );
        const widths = columns.map(
            (column) => column.getBoundingClientRect().width,
        );
        const adjacentRect = adjacent.getBoundingClientRect();
        const tableRect = table.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const shellRect = shell.getBoundingClientRect();
        const rowIndex = Array.from(table.rows).indexOf(row);
        const tableDocument = tableNode.toJSON() as DocumentNode;
        const logicalBoundary = cellBoundaryPosition(
            tableDocument,
            widths,
            rowIndex,
            cell.cellIndex,
        );

        if (widths.length < 2 || logicalBoundary === null) {
            return;
        }

        const boundaryStartX = tableRect.left + logicalBoundary;

        event.preventDefault();
        event.stopPropagation();
        resizeSession = {
            table: tableDocument,
            tablePosition,
            tableSize: tableNode.nodeSize,
            row: rowIndex,
            cell: cell.cellIndex,
            widths,
            tableLeft: tableRect.left,
            minimumX: boundaryStartX - cellRect.width + 20,
            maximumX: boundaryStartX + adjacentRect.width - 20,
            currentX: boundaryStartX,
            pointerStartX: event.clientX,
            boundaryStartX,
            guideStartX: cellRect.right,
            rowTop: rowRect.top - shellRect.top,
            rowHeight: rowRect.height,
            previewed: false,
        };
        resizeGuide.value = {
            left: cellRect.right - shellRect.left,
            top: rowRect.top - shellRect.top,
            height: rowRect.height,
        };
        window.addEventListener('mousemove', moveCellResize, true);
        window.addEventListener('mouseup', finishCellResize, true);
    };

    onBeforeUnmount(clearCellResize);

    return { resizeGuide, startCellResize };
}
