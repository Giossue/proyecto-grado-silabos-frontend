<script setup lang="ts">
import { computed } from 'vue';
import type { FichaProposalValue } from '@/api/ficha-imports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps<{ value: FichaProposalValue; label: string }>();
const table = computed(() => typeof props.value === 'object' && !Array.isArray(props.value) ? props.value : null);
const lines = computed(() => typeof props.value === 'string' ? [props.value] : Array.isArray(props.value) ? props.value : []);
</script>

<template>
  <Table v-if="table" :label="label">
    <TableHeader><TableRow><TableHead v-for="(column, index) in table.columns" :key="index" scope="col">{{ column }}</TableHead></TableRow></TableHeader>
    <TableBody><TableRow v-for="(row, index) in table.rows" :key="index"><TableCell v-for="(cell, column) in row" :key="column" :data-label="table.columns[column]">{{ cell || '—' }}</TableCell></TableRow></TableBody>
  </Table>
  <ul v-else-if="Array.isArray(value)" class="list-disc pl-5"><li v-for="(line, index) in lines" :key="index" class="whitespace-pre-wrap">{{ line }}</li></ul>
  <p v-else class="whitespace-pre-wrap">{{ value }}</p>
</template>
