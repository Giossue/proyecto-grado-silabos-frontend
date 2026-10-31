<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import type { ReviewDetail } from '@/api/reviews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { reviewAreaPaths } from '@/lib/routes';

const props = defineProps<{ history: ReviewDetail['history']; currentId: string }>();
const newestFirst = computed(() => props.history.map((item, index) => ({ item, previous: props.history[index - 1] ?? null })).reverse());
const open = defineModel<boolean>('open', { default: false });
const area = reviewAreaPaths();
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent :aria-describedby="undefined" class="sm:max-w-md">
      <SheetHeader><SheetTitle>Historial</SheetTitle></SheetHeader>
      <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-14rem)]">
        <ol class="flex flex-col divide-y px-4" aria-label="Revisiones enviadas">
          <li v-for="{ item, previous } in newestFirst" :key="item.id" class="flex flex-col gap-2 py-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span v-if="item.id === currentId" class="font-medium">Revisión {{ item.number }} (actual)</span>
              <Button v-else as-child variant="link" class="h-auto p-0"><RouterLink :to="area.review(item.id)" @click="open = false">Revisión {{ item.number }}</RouterLink></Button>
              <Badge v-if="item.approved_at" variant="secondary">Aprobada</Badge>
            </div>
            <p class="text-muted-foreground">{{ item.submitted_by }} · {{ formatDateDisplay(item.submitted_at, { dateStyle: 'medium' }) }}</p>
            <div class="flex flex-wrap gap-2">
              <Button v-if="previous" as-child size="sm" variant="outline"><RouterLink :to="area.comparison(previous.id, item.id)">Comparar con la revisión {{ previous.number }}</RouterLink></Button>
              <span v-else class="text-muted-foreground">Primera revisión: no hay una anterior con qué comparar.</span>
            </div>
          </li>
        </ol>
      </ScrollArea>
      <SheetFooter><SheetClose as-child><Button type="button" variant="outline">Cerrar</Button></SheetClose></SheetFooter>
    </SheetContent>
  </Sheet>
</template>
