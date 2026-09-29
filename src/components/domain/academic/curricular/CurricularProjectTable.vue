<script setup lang="ts">
import { computed } from 'vue';
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
    <p v-else-if="!subjects.length" class="text-sm text-muted-foreground">La malla todavía no tiene asignaturas.</p>
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
              :title="valueFor(concept.key, subject.id) ? source(valueFor(concept.key, subject.id)!) : undefined"
            >
              <CurricularValuePreview v-if="valueFor(concept.key, subject.id)" :definition="valueFor(concept.key, subject.id)" :value="valueFor(concept.key, subject.id)!.value" />
              <span v-else class="text-sm text-muted-foreground">Sin dato</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
