<script setup lang="ts">
import { computed } from 'vue';
import { Info } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/domain/EmptyState.vue';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ConfirmedCurricularValue, CurricularImportIndex } from '@/api/curricular-imports';
import CurricularValuePreview from './CurricularValuePreview.vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const props = defineProps<{
  subjects: CurricularImportIndex['subjects'];
  concepts: CurricularImportIndex['concepts'];
  values: ConfirmedCurricularValue[];
}>();

const subjects = computed(() => [...props.subjects].sort((left, right) => left.name.localeCompare(right.name, 'es')));
const values = computed(() => new Map(props.values.map((item) => [`${item.concept_key}:${item.subject_id}`, item])));
const valueFor = (key: string, subjectId: string): ConfirmedCurricularValue | undefined => values.value.get(`${key}:${subjectId}`);
const source = (item: ConfirmedCurricularValue): string =>
  item.evidence.map((evidence) => [evidence.source_name, evidence.locator].filter(Boolean).join(' · ')).join('\n');
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <Empty v-if="!concepts.length" class="border">
      <EmptyHeader>
        <EmptyTitle>La plantilla todavía no pide datos del Proyecto de carrera</EmptyTitle>
        <EmptyDescription>Cuando Administración los agregue en la plantilla, aparecerán aquí para completarlos.</EmptyDescription>
      </EmptyHeader>
    </Empty>
    <EmptyState v-else-if="!subjects.length" title="La malla todavía no tiene asignaturas." />
    <div v-else class="min-w-0 overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="sticky left-0 z-10 min-w-48 bg-background">Asignatura</TableHead>
            <TableHead v-for="concept in concepts" :key="concept.key" class="min-w-64">{{ concept.label }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="subject in subjects" :key="subject.id">
            <TableCell class="sticky left-0 z-10 bg-background align-top whitespace-normal">
              <span class="font-medium">{{ subject.name }}</span>
              <span class="block text-xs text-muted-foreground">{{ subject.code }}</span>
            </TableCell>
            <TableCell
              v-for="concept in concepts"
              :key="concept.key"
              class="align-top whitespace-normal"
            >
              <CurricularValuePreview v-if="valueFor(concept.key, subject.id)" :definition="valueFor(concept.key, subject.id)" :value="valueFor(concept.key, subject.id)!.value" />
              <span v-else class="text-sm text-muted-foreground">Sin dato</span>
              <Tooltip v-if="valueFor(concept.key, subject.id)?.evidence.length">
                <TooltipTrigger as-child><Button type="button" variant="ghost" size="icon-sm" :aria-label="`Ver procedencia de ${concept.label} para ${subject.name}`"><Info aria-hidden="true" /></Button></TooltipTrigger>
                <TooltipContent class="whitespace-pre-line">{{ source(valueFor(concept.key, subject.id)!) }}</TooltipContent>
              </Tooltip>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
