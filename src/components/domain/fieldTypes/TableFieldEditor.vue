<script setup lang="ts">
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tableCell, tableColumns, tableRows, withTableCell } from '@/components/domain/fieldTypes/tableField';
import type { TableValue, TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField; modelValue: unknown; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: TableValue] }>();
const update = (row: string, column: string, text: string): void =>
    emit('update:modelValue', withTableCell(props.field, props.modelValue, row, column, text));
</script>

<template>
  <div :id="id ?? `input-${field.id ?? field.key}`" class="table-field-editor overflow-x-auto rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-32"><span class="sr-only">Fila</span></TableHead>
          <TableHead v-for="column in tableColumns(field)" :key="column.key">{{ column.label }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in tableRows(field)" :key="row.key">
          <TableHead scope="row" class="font-medium">{{ row.label }}</TableHead>
          <TableCell v-for="column in tableColumns(field)" :key="column.key" class="min-w-32 p-1">
            <Input :model-value="tableCell(modelValue, row.key, column.key)" :disabled="disabled" :aria-label="`${row.label}, ${column.label}`" @update:model-value="update(row.key, column.key, String($event))" />
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
