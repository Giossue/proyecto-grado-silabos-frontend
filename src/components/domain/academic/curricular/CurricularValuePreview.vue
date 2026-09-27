<script setup lang="ts">
import { computed } from 'vue';
import type { CurricularDefinition, CurricularProposedValue } from '@/api/curricular-imports';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps<{ definition?: CurricularDefinition; value: CurricularProposedValue['value'] }>();
const list = computed(() => Array.isArray(props.value) && props.value.every((item) => typeof item === 'string') ? props.value as string[] : null);
const rows = computed(() => Array.isArray(props.value) && props.value.every((item) => typeof item === 'object' && item !== null) ? props.value as Array<Record<string, string>> : []);
const columns = computed(() => props.definition?.columns ?? Object.keys(rows.value[0] ?? {}).map((key) => ({ key, label: key })));
</script>
<template>
  <p v-if="typeof value === 'string'" class="whitespace-pre-wrap break-words text-sm">{{ value }}</p>
  <ul v-else-if="list" class="flex list-disc flex-col gap-1 pl-5 text-sm">
    <li v-for="(item, index) in list" :key="index" class="break-words">{{ item }}</li>
  </ul>
  <div v-else class="min-w-0 overflow-x-auto">
    <Table>
      <TableHeader><TableRow><TableHead v-for="column in columns" :key="column.key">{{ column.label }}</TableHead></TableRow></TableHeader>
      <TableBody><TableRow v-for="(row, index) in rows" :key="index"><TableCell v-for="column in columns" :key="column.key" class="whitespace-normal break-words">{{ row[column.key] ?? '—' }}</TableCell></TableRow></TableBody>
    </Table>
  </div>
</template>
