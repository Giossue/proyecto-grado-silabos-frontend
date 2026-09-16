<script setup lang="ts">
import { computed } from "vue";
import type { TableColumn } from "@/api/syllabi";

const props = defineProps<{
  value?: unknown;
  rows?: Array<{ id?: string; position?: number; data: unknown }>;
  columns?: TableColumn[] | null;
}>();
const rowObjects = computed(() =>
  (props.rows ?? [])
    .map((row) => row.data)
    .filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    ),
);
const displayColumns = computed(() => {
  if (props.columns?.length) {
    return props.columns.map((column) => ({ key: column.key, label: column.label }));
  }

  return Array.from(new Set(rowObjects.value.flatMap((row) => Object.keys(row))))
    .map((key) => ({ key, label: key }));
});
const text = (value: unknown): string =>
  value === null || value === undefined || value === ""
    ? "Sin contenido"
    : typeof value === "boolean"
      ? value
        ? "Sí"
        : "No"
      : String(value);
</script>

<template>
  <div v-if="rows?.length" class="w-full overflow-x-auto rounded-md border">
    <table v-if="displayColumns.length" class="w-full caption-bottom text-sm">
      <thead>
        <tr class="border-b bg-muted/50">
          <th v-for="column in displayColumns" :key="column.key" class="h-10 px-3 text-left align-middle font-medium">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rowObjects" :key="rows[index]?.id ?? index" class="border-b last:border-0">
          <td v-for="column in displayColumns" :key="column.key" class="p-3 align-middle">
            {{ text(row[column.key]) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="space-y-2 p-3">
      <SnapshotValue
        v-for="(row, index) in rows"
        :key="row.id ?? index"
        :value="row.data"
      />
    </div>
  </div>
  <ul v-else-if="Array.isArray(value)" class="list-disc space-y-1 pl-5">
    <li v-for="(item, index) in value" :key="index">
      <SnapshotValue :value="item" />
    </li>
  </ul>
  <dl
    v-else-if="typeof value === 'object' && value !== null"
    class="grid gap-2"
  >
    <template v-for="(item, key) in value as Record<string, unknown>" :key="key"
      ><dt class="font-medium">{{ key }}</dt>
      <dd class="text-muted-foreground"><SnapshotValue :value="item" /></dd
    ></template>
  </dl>
  <span v-else>{{ text(value) }}</span>
</template>
