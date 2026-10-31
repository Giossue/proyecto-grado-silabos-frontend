<script setup lang="ts">
import { MessageSquare } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import type { SyllabusDetail } from '@/api/syllabi';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import FormSheet from '@/components/domain/FormSheet.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getInitials } from '@/composables/useInitials';
import { formatDateDisplay } from '@/lib/dateDisplay';

type ReviewComment = NonNullable<SyllabusDetail['review_comments']>[number];
type Stage = ReviewComment['stage'];

const props = defineProps<{ comments: ReviewComment[] }>();

const STAGE_NAME: Record<Stage, string> = { biblioteca: 'Biblioteca', coordinacion: 'Coordinación' };
const stages = computed(() => (['coordinacion', 'biblioteca'] as Stage[]).filter((stage) => props.comments.some((item) => item.stage === stage)));
const latestStage = computed(() => props.comments[0]!.stage);
const open = ref(false);
const stage = ref<Stage>(latestStage.value);
const shown = computed(() => props.comments.filter((item) => item.stage === stage.value));

watch(latestStage, (value) => { stage.value = value; });
watch(open, (value) => { if (value) stage.value = latestStage.value; });
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Button type="button" variant="ghost" size="icon" aria-label="Comentarios" @click="open = true"><MessageSquare aria-hidden="true" /></Button>
      </TooltipTrigger>
      <TooltipContent>Comentarios</TooltipContent>
    </Tooltip>
  </TooltipProvider>
  <FormSheet v-model:open="open" trigger-label="Comentarios" title="Comentarios" :show-trigger="false">
    <div class="flex flex-col gap-4">
      <Tabs v-if="stages.length > 1" v-model="stage">
        <TabsList class="w-full" aria-label="Filtrar comentarios">
          <TabsTrigger v-for="item in stages" :key="item" :value="item">{{ STAGE_NAME[item] }}</TabsTrigger>
        </TabsList>
      </Tabs>
      <ol class="review-comments flex flex-col gap-4" aria-label="Comentarios de la revisión">
        <li v-for="(item, index) in shown" :key="`${item.commented_at}-${index}`" class="flex flex-col gap-2 rounded-lg bg-secondary p-4 text-sm">
          <div class="flex items-center gap-2">
            <Avatar class="size-8 shrink-0"><AvatarFallback class="text-xs">{{ getInitials(item.commented_by) }}</AvatarFallback></Avatar>
            <div class="flex min-w-0 flex-1 flex-col">
              <p class="truncate font-medium">{{ item.commented_by }}</p>
              <p class="text-xs text-muted-foreground">{{ STAGE_NAME[item.stage] }} · {{ formatDateDisplay(item.commented_at) }}</p>
            </div>
            <span class="text-xs font-medium text-muted-foreground tabular-nums">Envío {{ item.revision_number }}</span>
          </div>
          <p class="break-words whitespace-pre-wrap">{{ item.comment }}</p>
        </li>
      </ol>
    </div>
  </FormSheet>
</template>
