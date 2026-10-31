<script setup lang="ts">
import { MessageSquareWarning } from '@lucide/vue';
import { computed } from 'vue';
import type { SyllabusDetail } from '@/api/syllabi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatDateDisplay } from '@/lib/dateDisplay';

type ReviewComment = NonNullable<SyllabusDetail['review_comments']>[number];

const props = defineProps<{ comments: ReviewComment[] }>();

const STAGE_NAME: Record<ReviewComment['stage'], string> = { biblioteca: 'Biblioteca', coordinacion: 'Coordinación' };
const latest = computed(() => props.comments[0]!);
</script>

<template>
  <Alert class="review-comment bg-notice text-notice-foreground ring-notice-border [&>svg]:text-warning">
    <MessageSquareWarning aria-hidden="true" />
    <AlertTitle>{{ STAGE_NAME[latest.stage] }} pidió correcciones</AlertTitle>
    <AlertDescription class="flex flex-col gap-1 text-notice-foreground/80">
      <p class="break-words whitespace-pre-wrap text-foreground">{{ latest.comment }}</p>
      <p class="text-xs">{{ latest.commented_by }} · {{ formatDateDisplay(latest.commented_at) }}</p>
    </AlertDescription>
  </Alert>
</template>
