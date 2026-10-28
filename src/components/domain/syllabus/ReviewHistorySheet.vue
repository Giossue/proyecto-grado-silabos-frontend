<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { ReviewDetail } from '@/api/reviews';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { formatDateDisplay } from '@/lib/dateDisplay';
import { reviewAreaPaths } from '@/lib/routes';

defineProps<{ history: ReviewDetail['history']; currentId: string }>();
const open = defineModel<boolean>('open', { default: false });
const area = reviewAreaPaths();
</script>

<template>
  <Sheet v-model:open="open">
    <SheetContent :aria-describedby="undefined" class="sm:max-w-md">
      <SheetHeader><SheetTitle>Historial</SheetTitle></SheetHeader>
      <ScrollArea class="min-h-0 flex-1">
        <ol class="flex flex-col divide-y px-4" aria-label="Revisiones enviadas">
          <li v-for="(item, index) in history" :key="item.id" class="flex flex-col gap-2 py-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span v-if="item.id === currentId" class="font-medium">Revisión {{ item.number }} (abierta)</span>
              <Button v-else as-child variant="link" class="h-auto p-0"><RouterLink :to="area.review(item.id)" @click="open = false">Revisión {{ item.number }}</RouterLink></Button>
              <Badge v-if="item.approved_at" variant="secondary">Aprobada</Badge>
            </div>
            <p class="text-muted-foreground">{{ item.submitted_by }} · {{ formatDateDisplay(item.submitted_at, { dateStyle: 'medium' }) }}</p>
            <div v-if="item.approved_at || index > 0" class="flex flex-wrap gap-2">
              <Button v-if="index > 0" as-child size="sm" variant="outline"><RouterLink :to="area.comparison(history[index - 1]!.id, item.id)">Comparar con la anterior</RouterLink></Button>
              <Button v-if="item.approved_at" as-child size="sm" variant="outline"><RouterLink :to="area.documents(item.id)">PDF</RouterLink></Button>
            </div>
          </li>
        </ol>
      </ScrollArea>
      <SheetFooter><SheetClose as-child><Button type="button" variant="outline">Cerrar</Button></SheetClose></SheetFooter>
    </SheetContent>
  </Sheet>
</template>
