<script setup lang="ts">
import { computed } from "vue";
import type { RepeatableRow, TableLayout } from "@/api/syllabi";

const props = defineProps<{
  layout: TableLayout;
  rows: RepeatableRow[];
  disabled?: boolean;
}>();

const emit = defineEmits<{ "update:rows": [rows: RepeatableRow[]] }>();

type Unit = { number: number; header: RepeatableRow | null; rows: RepeatableRow[] };

const clone = (): RepeatableRow[] =>
  props.rows.map((row) => ({ ...row, data: { ...row.data } }));

const normalize = (rows: RepeatableRow[]): RepeatableRow[] =>
  rows.map((row, index) => ({ ...row, position: index + 1 }));

const update = (rows: RepeatableRow[]): void => emit("update:rows", normalize(rows));

const units = computed<Unit[]>(() => {
  const grouped = new Map<number, Unit>();
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

const setHeader = (unit: Unit, key: string, value: string): void => {
  const rows = clone();
  const existing = unit.header ? props.rows.indexOf(unit.header) : -1;
  if (existing >= 0) {
    rows[existing]!.data[key] = value;
  } else {
    const data: Record<string, string | number | null> = {
      _unit: unit.number,
      _kind: "unit",
      [key]: value,
    };
    for (const field of props.layout.header_fields) data[field.key] ??= null;
    rows.push({ position: rows.length + 1, data });
  }
  update(rows);
};

const addRow = (unit: Unit): void => {
  const data: Record<string, string | number | null> = {};
  if (props.layout.repeat.enabled || props.layout.header_fields.length) {
    data._unit = unit.number;
  }
  for (const column of props.layout.columns) data[column.key] = null;
  const rows = clone();
  rows.push({ position: rows.length + 1, data });
  update(rows);
};

const removeRow = (target: RepeatableRow): void => {
  const index = props.rows.indexOf(target);
  if (index < 0) return;
  const rows = clone();
  rows.splice(index, 1);
  update(rows);
};

const addUnit = (): void => {
  const number = Math.max(0, ...units.value.map((unit) => unit.number)) + 1;
  const rows = clone();
  for (const unit of units.value) {
    if (unit.header || unit.rows.length) continue;
    const emptyHeader: Record<string, string | number | null> = {
      _unit: unit.number,
      _kind: "unit",
    };
    for (const field of props.layout.header_fields) emptyHeader[field.key] = null;
    rows.push({ position: rows.length + 1, data: emptyHeader });
  }
  const data: Record<string, string | number | null> = {
    _unit: number,
    _kind: "unit",
  };
  for (const field of props.layout.header_fields) data[field.key] = null;
  rows.push({ position: rows.length + 1, data });
  update(rows);
};

const removeUnit = (number: number): void => {
  update(
    clone()
      .filter((row) => Number(row.data._unit ?? 1) !== number)
      .map((row) => {
        const current = Number(row.data._unit ?? 1);
        if (current > number) row.data._unit = current - 1;
        return row;
      }),
  );
};

const setCell = (target: RepeatableRow, key: string, raw: string, type: "text" | "number"): void => {
  const index = props.rows.indexOf(target);
  if (index < 0) return;
  const rows = clone();
  rows[index]!.data[key] = type === "number" && raw !== "" ? Number(raw) : raw;
  update(rows);
};

const total = (rows: RepeatableRow[], key: string): number =>
  rows.reduce((sum, row) => {
    const numeric = Number(row.data[key]);
    return Number.isFinite(numeric) ? sum + numeric : sum;
  }, 0);

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
</script>

<template>
  <div class="syllabus-repeatable-editor">
    <section v-for="unit in units" :key="unit.number" class="syllabus-table-unit">
      <header v-if="layout.repeat.enabled">
        <strong>{{ layout.repeat.label }} {{ unit.number }}</strong>
        <button
          v-if="units.length > 1"
          type="button"
          :disabled="disabled"
          @click="removeUnit(unit.number)"
        >Quitar {{ layout.repeat.label.toLowerCase() }}</button>
      </header>
      <label v-for="field in layout.header_fields" :key="field.key" class="unit-header-field">
        {{ field.label }}
        <textarea
          :value="String(unit.header?.data[field.key] ?? '')"
          :disabled="disabled"
          @input="setHeader(unit, field.key, ($event.target as HTMLTextAreaElement).value)"
        />
      </label>
      <div class="syllabus-table-scroll">
        <table>
          <thead>
            <tr v-for="(cells, rowIndex) in headerRows" :key="rowIndex">
              <th v-for="cell in cells" :key="`${rowIndex}-${cell.key}`" :colspan="cell.colspan">
                {{ cell.label }}
              </th>
              <th v-if="rowIndex === 0" :rowspan="headerRows.length + 1" aria-label="Acciones"></th>
            </tr>
            <tr>
              <th v-for="column in layout.columns" :key="column.key">{{ column.label }}</th>
              <th v-if="!headerRows.length" aria-label="Acciones"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!unit.rows.length">
              <td :colspan="layout.columns.length + 1">Aún no hay filas.</td>
            </tr>
            <tr v-for="row in unit.rows" :key="row.id ?? row.position">
              <td v-for="column in layout.columns" :key="column.key">
                <input
                  :value="row.data[column.key] ?? ''"
                  :type="column.type === 'number' ? 'number' : 'text'"
                  :disabled="disabled"
                  @input="setCell(row, column.key, ($event.target as HTMLInputElement).value, column.type)"
                />
              </td>
              <td><button type="button" :disabled="disabled" @click="removeRow(row)">Quitar</button></td>
            </tr>
          </tbody>
          <tfoot v-if="layout.totals.enabled">
            <tr>
              <th v-for="(column, index) in layout.columns" :key="column.key">
                <template v-if="index === 0">{{ layout.totals.label }}</template>
                <template v-else-if="column.type === 'number' && column.sum">{{ total(unit.rows, column.key) }}</template>
              </th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" :disabled="disabled" @click="addRow(unit)">Agregar fila</button>
    </section>
    <button
      v-if="layout.repeat.enabled"
      type="button"
      :disabled="disabled"
      @click="addUnit"
    >Agregar {{ layout.repeat.label.toLowerCase() }}</button>
  </div>
</template>
