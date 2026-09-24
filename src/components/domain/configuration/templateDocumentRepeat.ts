import { h } from 'vue';
import type { VNodeChild } from 'vue';
import { Button } from '@/components/ui/button';
import { groupByUnit, sumColumn, formatSum } from '@/lib/tableLayout';
import type {
    PlanningExpectations,
    TableLayout,
    TableRowData,
} from '@/lib/tableLayout';
import type { DocumentField, DocumentNode } from '@/lib/templateDocument';
import type {
    Context,
    Row,
} from '@/components/domain/configuration/templateDocumentRender';

type Options = {
    props: {
        editable?: boolean;
        planningExpectations?: PlanningExpectations | null;
    };
    draw: (node: DocumentNode, context: Context, path: string) => VNodeChild;
    tableWithAction: (table: DocumentNode, content: VNodeChild[]) => VNodeChild;
    addRecord: (field: DocumentField, unit: number) => void;
    addUnit: (field: DocumentField, number: number) => void;
    removeUnit: (field: DocumentField, number: number) => void;
    removeRecord: (field: DocumentField, row: Row) => void;
};

export const createRepeatTable =
    (options: Options) =>
    (
        node: DocumentNode,
        field: DocumentField,
        layout: TableLayout,
        path: string,
    ): VNodeChild => {
        const grouped = groupByUnit(field.rows ?? [], layout.repeat.enabled);
        const units = grouped.length
            ? grouped
            : [{ number: 1, header: null, rows: [] }];
        const tables = units.map((unit) => {
            const totals: TableRowData = {};

            for (const column of layout.columns) {
                if (column.type === 'number' && column.sum !== false) {
                    totals[column.key] = formatSum(
                        sumColumn(
                            unit.rows.map((row) => row.data),
                            column.key,
                        ),
                    );
                }
            }

            const content: VNodeChild[] = [];
            const designRows = node.content ?? [];

            for (let index = 0; index < designRows.length; index++) {
                const source = designRows[index];
                const role = String(source.attrs?.rowRole ?? 'fixed');

                if (role === 'record') {
                    const group = [source];

                    while (designRows[index + 1]?.attrs?.rowRole === 'record') {
                        group.push(designRows[++index]);
                    }

                    for (const [rowIndex, record] of (unit.rows.length
                        ? unit.rows
                        : [null]
                    ).entries()) {
                        group.forEach((row, offset) =>
                            content.push(
                                options.draw(
                                    row,
                                    {
                                        field,
                                        row: record ?? undefined,
                                        role,
                                        unit: unit.number,
                                    },
                                    `${path}-u${unit.number}-r${rowIndex}-${offset}`,
                                ),
                            ),
                        );
                    }
                } else {
                    content.push(
                        options.draw(
                            source,
                            {
                                field,
                                row: unit.header ?? undefined,
                                role,
                                unit: unit.number,
                                totals,
                            },
                            `${path}-u${unit.number}-${index}`,
                        ),
                    );
                }
            }

            return h(
                'div',
                { class: 'document-repeat-unit', key: unit.number },
                [
                    layout.repeat.enabled
                        ? h(
                              'p',
                              { class: 'font-bold', 'data-page-keep-next': '' },
                              `${layout.repeat.label ?? 'Unidad'} ${unit.number}`,
                          )
                        : null,
                    options.tableWithAction(node, content),
                    options.props.editable
                        ? h('div', { class: 'flex flex-wrap gap-2 py-2' }, [
                              h(
                                  Button,
                                  {
                                      type: 'button',
                                      variant: 'outline',
                                      onClick: () =>
                                          options.addRecord(field, unit.number),
                                  },
                                  () => 'Agregar fila de datos',
                              ),
                              ...(layout.repeat.enabled && units.length > 1
                                  ? [
                                        h(
                                            Button,
                                            {
                                                type: 'button',
                                                variant: 'ghost',
                                                onClick: () =>
                                                    options.removeUnit(
                                                        field,
                                                        unit.number,
                                                    ),
                                            },
                                            () =>
                                                `Quitar ${(layout.repeat.label ?? 'Unidad').toLowerCase()}`,
                                        ),
                                    ]
                                  : []),
                              ...unit.rows.map((row, i) =>
                                  h(
                                      Button,
                                      {
                                          type: 'button',
                                          variant: 'ghost',
                                          onClick: () =>
                                              options.removeRecord(field, row),
                                      },
                                      () => `Quitar fila ${i + 1}`,
                                  ),
                              ),
                          ])
                        : null,
                ],
            );
        });

        if (options.props.editable && layout.repeat.enabled) {
            tables.push(
                h(
                    Button,
                    {
                        type: 'button',
                        variant: 'outline',
                        onClick: () =>
                            options.addUnit(
                                field,
                                Math.max(...units.map((unit) => unit.number)) +
                                    1,
                            ),
                    },
                    () => 'Agregar unidad',
                ),
            );
        }

        return h('div', { class: 'flex flex-col gap-3' }, tables);
    };
