<script setup lang="ts">
import { emptyWeek, firstWeek, formatHours, unitsOf, unitTotals } from '@/components/domain/fieldTypes/unitsField';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
// Sin unidades se dibuja una de ejemplo en blanco: así la plantilla muestra el formato oficial.
const units = (): ReturnType<typeof unitsOf> => {
  const value = unitsOf(props.field.value);
  return value.length > 0 ? value : [{ nombre: '', resultado: '', semanas: Array.from({ length: 16 }, emptyWeek) }];
};
</script>

<template>
  <div class="units-field-view flex flex-col gap-6">
    <section v-for="(unit, index) in units()" :key="index" class="overflow-x-auto rounded-md border" :aria-label="`Unidad ${index + 1}`">
      <Table class="border-collapse [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r">
        <TableHeader>
          <TableRow><TableHead>Unidad No. {{ index + 1 }}</TableHead><TableHead colspan="8">{{ unit.nombre || 'Sin nombre' }}</TableHead></TableRow>
          <TableRow><TableHead>Resultados de aprendizaje</TableHead><TableHead colspan="8" class="font-normal whitespace-pre-wrap">{{ unit.resultado }}</TableHead></TableRow>
          <TableRow>
            <TableHead>Contenidos temáticos</TableHead><TableHead>Semana</TableHead><TableHead>ACD</TableHead><TableHead>APE</TableHead><TableHead>AA</TableHead>
            <TableHead>Actividades ACD</TableHead><TableHead>Actividades APE</TableHead><TableHead>Actividades AA</TableHead><TableHead>Evaluación</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(week, w) in unit.semanas" :key="w">
            <TableCell class="whitespace-pre-wrap">{{ week.contenidos }}</TableCell>
            <TableCell>{{ firstWeek(units(), index) + w }}</TableCell>
            <TableCell>{{ week.acd_h }}</TableCell><TableCell>{{ week.ape_h }}</TableCell><TableCell>{{ week.aa_h }}</TableCell>
            <TableCell class="whitespace-pre-wrap">{{ week.acd }}</TableCell><TableCell class="whitespace-pre-wrap">{{ week.ape }}</TableCell><TableCell class="whitespace-pre-wrap">{{ week.aa }}</TableCell>
            <TableCell class="whitespace-pre-wrap">{{ week.evaluacion }}</TableCell>
          </TableRow>
          <TableRow class="font-medium">
            <TableCell colspan="2" class="text-right">Total, horas</TableCell>
            <TableCell>{{ formatHours(unitTotals(unit).acd) }}</TableCell><TableCell>{{ formatHours(unitTotals(unit).ape) }}</TableCell><TableCell>{{ formatHours(unitTotals(unit).aa) }}</TableCell>
            <TableCell colspan="4" />
          </TableRow>
        </TableBody>
      </Table>
    </section>
  </div>
</template>
