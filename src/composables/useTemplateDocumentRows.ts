import { consecutiveUnits, planningColumns } from '@/lib/tableLayout';
import type {
    PlanningExpectations,
    TableLayout,
    TableRowData,
} from '@/lib/tableLayout';
import type { DocumentField } from '@/lib/templateDocument';
import type {
    Context,
    Row,
} from '@/components/domain/configuration/templateDocumentRender';

type Options = {
    layout: () => TableLayout | null;
    planningExpectations: () => PlanningExpectations | null | undefined;
    emit: (event: 'rows', key: string, rows: Row[]) => void;
};

export function useTemplateDocumentRows(options: Options) {
    const setColumn = (
        context: Context,
        key: string,
        value: string | number,
    ) => {
        const field = context.field;

        if (!field) {
            return;
        }

        const rows = (field.rows ?? []).map((row) => ({
            id: row.id,
            data: { ...row.data },
        }));
        let index = (field.rows ?? []).indexOf(context.row!);

        if (index < 0) {
            rows.push({
                id: null,
                data: {
                    _unit: context.unit ?? 1,
                    ...(context.role === 'unit' ? { _kind: 'unit' } : {}),
                },
            });
            index = rows.length - 1;
        }

        rows[index].data[key] = value;
        options.emit('rows', field.key, rows);
    };
    const addRecord = (field: DocumentField, unit: number) => {
        const data: TableRowData = { _unit: unit };
        const layout = options.layout();
        const weekKey = layout ? planningColumns(layout).week : null;

        if (weekKey) {
            const used = new Set(
                (field.rows ?? [])
                    .map((row) => Number(row.data[weekKey]))
                    .filter((week) => Number.isInteger(week) && week > 0),
            );
            const maximum =
                options.planningExpectations()?.teaching_weeks ?? 52;
            data[weekKey] =
                Array.from({ length: maximum }, (_, index) => index + 1).find(
                    (week) => !used.has(week),
                ) ?? '';
        }

        options.emit('rows', field.key, [
            ...(field.rows ?? []),
            { id: null, data },
        ]);
    };
    const unitHeader = (number: number) => {
        const data: TableRowData = { _unit: number, _kind: 'unit' };

        for (const header of options.layout()?.header_fields ?? []) {
            data[header.key] = '';
        }

        return { id: null, data };
    };
    /**
     * Sin filas, la «Unidad 1» vacía que se ve en pantalla también se guarda, para
     * que la nueva no quede como «Unidad 2» sin la 1.
     */
    const addUnit = (field: DocumentField, number: number) => {
        const rows = field.rows ?? [];

        options.emit('rows', field.key, [
            ...rows,
            ...(rows.length === 0 ? [unitHeader(1)] : []),
            unitHeader(rows.length === 0 ? Math.max(2, number) : number),
        ]);
    };
    /** Quita la unidad y renumera las demás 1, 2, 3… sin huecos. */
    const removeUnit = (field: DocumentField, number: number) =>
        options.emit(
            'rows',
            field.key,
            consecutiveUnits(
                (field.rows ?? []).filter(
                    (row) => Number(row.data._unit ?? 1) !== number,
                ),
            ),
        );
    const removeRecord = (field: DocumentField, row: Row) =>
        options.emit(
            'rows',
            field.key,
            (field.rows ?? []).filter((item) => item !== row),
        );

    return { setColumn, addRecord, addUnit, removeUnit, removeRecord };
}
