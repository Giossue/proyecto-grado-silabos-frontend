<script setup lang="ts">
import { BookOpenCheck, Building2, CalendarRange, CircleAlert, ClipboardCheck, FileSignature, FileStack, Library, MessageSquareText, PencilLine, UsersRound } from '@lucide/vue';
import type { Component } from 'vue';
import type { DashboardMetric } from '@/api/dashboard';
import StatTile from '@/components/domain/StatTile.vue';

defineProps<{ metrics: DashboardMetric[] }>();

const icons: Record<string, Component> = { progress: BookOpenCheck, days_left: CalendarRange, careers_without_convocation: Building2, not_started: PencilLine, in_review: ClipboardCheck, pending: FileStack, correction_requested: CircleAlert, teachers_pending: UsersRound, library_pending: Library, library_signed: FileSignature, library_commented: MessageSquareText };
</script>

<template>
  <div data-tour="metrics" class="grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
    <StatTile v-for="metric in metrics.slice(0, 3)" :key="metric.key" :label="metric.label" :value="metric.value" :suffix="metric.suffix ?? undefined" :hint="metric.hint" :icon="icons[metric.key]" />
  </div>
</template>
