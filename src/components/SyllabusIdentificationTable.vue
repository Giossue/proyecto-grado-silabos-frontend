<script setup lang="ts">
import type { IdentificationCell } from "@/api/syllabi";

defineProps<{ rows: IdentificationCell[][] }>();
</script>

<template>
  <div class="syllabus-table-scroll">
    <table class="syllabus-identification-table" aria-label="Identificación institucional">
      <colgroup>
        <col v-for="width in [15.9, 9.4, 4.6, 3.7, 8.5, 4.3, 13.8, 16.5, 23.2]" :key="width" :style="{ width: `${width}%` }" />
      </colgroup>
      <tbody>
        <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
          <td
            v-for="(cell, cellIndex) in row"
            :key="`${rowIndex}-${cellIndex}`"
            :colspan="cell.span"
            :rowspan="cell.rows"
            :class="[
              `identification-${cell.style}`,
              { 'is-bold': cell.bold, 'is-small': cell.small, 'is-centered': cell.center },
            ]"
          >
            <template v-for="(line, index) in cell.text.split('\n')" :key="index">
              <br v-if="index" />{{ line }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
