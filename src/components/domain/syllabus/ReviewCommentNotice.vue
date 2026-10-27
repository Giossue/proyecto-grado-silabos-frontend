<script setup lang="ts">
import { ChevronDown, MessageSquare, MessageSquareWarning } from '@lucide/vue';
import { computed } from 'vue';
import type { SyllabusDetail } from '@/api/syllabi';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { cn } from '@/lib/utils';

type ReviewComment = NonNullable<SyllabusDetail['review_comments']>[number];

// Los comentarios llegan del más reciente al más antiguo.
const props = defineProps<{ comments: ReviewComment[]; correction: boolean }>();

const STAGE_NAME: Record<ReviewComment['stage'], string> = { biblioteca: 'Biblioteca', coordinacion: 'Coordinación' };
const latest = computed(() => props.comments[0]);
const previous = computed(() => props.comments.slice(1));
const title = computed(() => props.correction
  ? `${STAGE_NAME[latest.value.stage]} pidió correcciones`
  : `Último comentario de ${STAGE_NAME[latest.value.stage]}`);
const meta = (item: ReviewComment): string => `${item.commented_by} · ${formatDateDisplay(item.commented_at)}`;
</script>

<template>
  <Alert :class="cn('review-comment', correction && 'bg-notice text-notice-foreground ring-notice-border [&>svg]:text-warning')">
    <MessageSquareWarning v-if="correction" aria-hidden="true" />
    <MessageSquare v-else aria-hidden="true" />
    <AlertTitle>{{ title }}</AlertTitle>
    <AlertDescription :class="cn('flex flex-col gap-1', correction && 'text-notice-foreground/80')">
      <p class="break-words whitespace-pre-wrap text-foreground">{{ latest.comment }}</p>
      <p class="text-xs">{{ meta(latest) }}</p>
      <Collapsible v-if="previous.length" class="mt-1">
        <CollapsibleTrigger as-child>
          <Button type="button" variant="ghost" size="sm" class="group/previous h-auto w-fit gap-1 p-0 text-xs font-medium text-inherit hover:bg-transparent hover:text-inherit hover:underline has-[>svg]:px-0"><ChevronDown class="transition-transform group-data-[state=open]/previous:rotate-180" aria-hidden="true" />Comentarios anteriores ({{ previous.length }})</Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ol class="mt-2 flex flex-col gap-2" aria-label="Comentarios anteriores de la revisión">
            <li v-for="(item, index) in previous" :key="`${item.commented_at}-${index}`" class="flex flex-col gap-0.5 border-l-2 border-current/20 pl-3">
              <p class="break-words whitespace-pre-wrap text-foreground">{{ item.comment }}</p>
              <p class="text-xs">{{ STAGE_NAME[item.stage] }} · {{ meta(item) }}</p>
            </li>
          </ol>
        </CollapsibleContent>
      </Collapsible>
    </AlertDescription>
  </Alert>
</template>
