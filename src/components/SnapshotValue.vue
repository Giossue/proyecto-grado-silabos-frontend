<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  value?: unknown;
  rows?: Array<{ id?: string; position?: number; data: unknown }>;
}>();
const rowObjects = computed(() =>
  (props.rows ?? [])
    .map((row) => row.data)
    .filter(
      (value): value is Record<string, unknown> =>
        typeof value === "object" && value !== null && !Array.isArray(value),
    ),
);
const columns = computed(() =>
  Array.from(new Set(rowObjects.value.flatMap((row) => Object.keys(row)))),
);
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
  <div v-if="rows?.length" class="snapshot-table-wrap">
    <table v-if="columns.length">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column">{{ column }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rowObjects" :key="rows[index]?.id ?? index">
          <td v-for="column in columns" :key="column">
            {{ text(row[column]) }}
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="snapshot-list">
      <SnapshotValue
        v-for="(row, index) in rows"
        :key="row.id ?? index"
        :value="row.data"
      />
    </div>
  </div>
  <ul v-else-if="Array.isArray(value)" class="snapshot-list">
    <li v-for="(item, index) in value" :key="index">
      <SnapshotValue :value="item" />
    </li>
  </ul>
  <dl
    v-else-if="typeof value === 'object' && value !== null"
    class="snapshot-object"
  >
    <template v-for="(item, key) in value as Record<string, unknown>" :key="key"
      ><dt>{{ key }}</dt>
      <dd><SnapshotValue :value="item" /></dd
    ></template>
  </dl>
  <span v-else>{{ text(value) }}</span>
</template>
