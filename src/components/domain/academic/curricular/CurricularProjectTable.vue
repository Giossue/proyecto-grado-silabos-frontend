<script setup lang="ts">
import { computed } from 'vue';
import type { ConfirmedCurricularValue, CurricularImportIndex } from '@/api/curricular-imports';
import CurricularValuePreview from './CurricularValuePreview.vue';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/**
 * Proyecto de carrera como tabla (COR-16): una fila por asignatura y una columna por
 * cada dato que pide la plantilla. Lo que es de toda la carrera va aparte.
 */
const props = defineProps<{
  subjects: CurricularImportIndex['subjects'];
  concepts: CurricularImportIndex['concepts'];
  values: ConfirmedCurricularValue[];
}>();

const bySubject = computed(() => props.concepts.filter((concept) => concept.scope === 'asignatura'));
const byCareer = computed(() => props.concepts.filter((concept) => concept.scope === 'carrera'));
const subjects = computed(() => [...props.subjects].sort((left, right) => left.name.localeCompare(right.name, 'es')));
const values = computed(() => new Map(props.values.map((item) => [`${item.concept_key}:${item.subject_id ?? ''}`, item])));
const valueFor = (key: string, subjectId: string | null = null): ConfirmedCurricularValue | undefined =>
  values.value.get(`${key}:${subjectId ?? ''}`);
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

    <template v-else>
      <section v-if="byCareer.length" class="flex min-w-0 flex-col gap-2" aria-labelledby="project-career-data">
        <h2 id="project-career-data" class="font-medium">Datos de toda la carrera</h2>
        <div class="min-w-0 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead class="w-56">Dato</TableHead><TableHead>Contenido</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow v-for="concept in byCareer" :key="concept.key">
                <TableCell class="align-top font-medium whitespace-normal">{{ concept.label }}</TableCell>
                <TableCell class="align-top whitespace-normal" :title="valueFor(concept.key) ? source(valueFor(concept.key)!) : undefined">
                  <CurricularValuePreview v-if="valueFor(concept.key)" :definition="valueFor(concept.key)" :value="valueFor(concept.key)!.value" />
                  <span v-else class="text-sm text-muted-foreground">Sin dato</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section v-if="bySubject.length" class="flex min-w-0 flex-col gap-2" aria-labelledby="project-subject-data">
        <h2 id="project-subject-data" class="font-medium">Datos por asignatura</h2>
        <p v-if="!subjects.length" class="text-sm text-muted-foreground">La malla todavía no tiene asignaturas.</p>
        <div v-else class="min-w-0 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="sticky left-0 z-10 min-w-48 bg-background">Asignatura</TableHead>
                <TableHead v-for="concept in bySubject" :key="concept.key" class="min-w-64">{{ concept.label }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="subject in subjects" :key="subject.id">
                <TableCell class="sticky left-0 z-10 bg-background align-top whitespace-normal">
                  <span class="font-medium">{{ subject.name }}</span>
                  <span class="block text-xs text-muted-foreground">{{ subject.code }}</span>
                </TableCell>
                <TableCell
                  v-for="concept in bySubject"
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
      </section>
    </template>
  </div>
</template>
