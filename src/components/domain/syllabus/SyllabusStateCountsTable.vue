<script setup lang="ts">
import type { SyllabusStateCounts } from '@/api/processes';
import { syllabusStateLabel } from '@/lib/syllabusStates';

defineProps<{ counts: SyllabusStateCounts; caption: string; total?: number }>();
</script>

<template>
  <table class="w-full text-sm">
    <caption class="sr-only">{{ caption }}</caption>
    <tbody>
      <tr v-for="(count, state) in counts" :key="state">
        <th scope="row" class="py-1 text-left font-medium">{{ syllabusStateLabel(String(state)) }}</th>
        <td class="py-1 text-right tabular-nums">{{ count }}</td>
      </tr>
      <tr v-if="total !== undefined" class="border-t">
        <th scope="row" class="py-1 text-left font-semibold">Total</th>
        <td class="py-1 text-right font-semibold tabular-nums">{{ total }}</td>
      </tr>
    </tbody>
  </table>
</template>
