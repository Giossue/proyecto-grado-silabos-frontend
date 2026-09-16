<script setup lang="ts">
import { computed } from "vue";
import type { RepeatableRow, TableLayout } from "@/api/syllabi";

const props = defineProps<{ layout: TableLayout; rows: RepeatableRow[] }>();

const units = computed(() => {
  const grouped = new Map<number, { number: number; header: RepeatableRow | null; rows: RepeatableRow[] }>();
  for (const row of props.rows) {
    const raw = Number(row.data._unit ?? 1);
    const number = Number.isInteger(raw) && raw > 0 ? raw : 1;
    const unit = grouped.get(number) ?? { number, header: null, rows: [] };
    if (row.data._kind === "unit") unit.header = row;
    else unit.rows.push(row);
    grouped.set(number, unit);
  }
  if (!grouped.size) grouped.set(1, { number: 1, header: null, rows: [] });

  return Array.from(grouped.values()).sort((a, b) => a.number - b.number);
});

const headerRows = computed(() => {
  const rows: Array<Array<{ key: string; label: string; colspan: number }>> = [];
  for (const level of ["band", "group"] as const) {
    const definitions = new Map(
      (level === "band" ? props.layout.bands : props.layout.groups)
        .map((item) => [item.key, item.label]),
    );
    if (!definitions.size) continue;
    const cells: Array<{ key: string; label: string; colspan: number }> = [];
    for (const column of props.layout.columns) {
      const value = column[level] ?? "";
      const previous = cells.at(-1);
      if (previous?.key === value) previous.colspan += 1;
      else cells.push({ key: value, label: definitions.get(value) ?? "", colspan: 1 });
    }
    rows.push(cells);
  }
  return rows;
});

const display = (value: unknown): string =>
  value === null || value === undefined ? "" : String(value);

const total = (rows: RepeatableRow[], key: string): number =>
  rows.reduce((sum, row) => {
    const numeric = Number(row.data[key]);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);
</script>

<template>
  <div class="syllabus-repeatable-view">
    <section v-for="unit in units" :key="unit.number" class="syllabus-table-unit">
      <table v-if="layout.repeat.enabled || layout.header_fields.length" class="unit-summary-table">
        <tbody>
          <tr v-if="layout.repeat.enabled">
            <th scope="row">{{ layout.repeat.label }} No.</th>
            <td>{{ unit.number }}</td>
          </tr>
          <tr v-for="field in layout.header_fields" :key="field.key">
            <th scope="row">{{ field.label }}</th>
            <td>{{ display(unit.header?.data[field.key]) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="syllabus-table-scroll">
        <table>
          <thead>
            <tr v-for="(cells, rowIndex) in headerRows" :key="rowIndex">
              <th v-for="cell in cells" :key="`${rowIndex}-${cell.key}`" :colspan="cell.colspan">
                {{ cell.label }}
              </th>
            </tr>
            <tr><th v-for="column in layout.columns" :key="column.key">{{ column.label }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="!unit.rows.length"><td :colspan="layout.columns.length">Sin filas</td></tr>
            <tr v-for="row in unit.rows" :key="row.id ?? row.position">
              <td v-for="column in layout.columns" :key="column.key">{{ display(row.data[column.key]) }}</td>
            </tr>
          </tbody>
          <tfoot v-if="layout.totals.enabled">
            <tr>
              <th v-for="(column, index) in layout.columns" :key="column.key">
                <template v-if="index === 0">{{ layout.totals.label }}</template>
                <template v-else-if="column.type === 'number' && column.sum">{{ total(unit.rows, column.key) }}</template>
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  </div>
</template>
