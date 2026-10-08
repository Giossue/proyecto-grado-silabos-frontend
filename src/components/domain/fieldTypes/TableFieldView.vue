<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { tableCell, tableColumns, tableRows } from '@/components/domain/fieldTypes/tableField';
import type { TypedField } from '@/types/configuration';

defineProps<{ field: TypedField }>();
</script>

<template>
  <div class="table-field-view overflow-x-auto rounded-md border">
    <Table :cards="false">
      <TableHeader>
        <TableRow>
          <TableHead class="w-32"><span class="sr-only">Fila</span></TableHead>
          <TableHead v-for="column in tableColumns(field)" :key="column.key">{{ column.label }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in tableRows(field)" :key="row.key">
          <TableHead scope="row" class="font-medium">{{ row.label }}</TableHead>
          <TableCell v-for="column in tableColumns(field)" :key="column.key" class="whitespace-pre-wrap">{{ tableCell(field.value, row.key, column.key) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
