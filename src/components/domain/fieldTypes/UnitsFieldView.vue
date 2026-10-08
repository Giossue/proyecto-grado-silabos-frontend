<script setup lang="ts">
import { emptyWeek, firstWeek, formatHours, MAX_WEEKS, unitsOf, unitTotals } from '@/components/domain/fieldTypes/unitsField';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TypedField }>();
// Sin unidades se dibuja una de ejemplo en blanco: así la plantilla muestra el formato oficial.
const units = (): ReturnType<typeof unitsOf> => {
  const value = unitsOf(props.field.value);
  return value.length > 0 ? value : [{ nombre: '', resultado: '', semanas: Array.from({ length: MAX_WEEKS }, emptyWeek) }];
};
</script>

<template>
  <div class="units-field-view flex flex-col gap-6">
    <section v-for="(unit, index) in units()" :key="index" :aria-label="`Unidad ${index + 1}`">
      <table class="units-table">
        <colgroup>
          <col style="width: 21%"><col style="width: 5%"><col style="width: 5%"><col style="width: 5%"><col style="width: 5%">
          <col style="width: 15%"><col style="width: 15%"><col style="width: 15%"><col style="width: 14%">
        </colgroup>
        <tbody>
          <tr>
            <th scope="row" rowspan="2" class="head left">Unidad No.</th>
            <td rowspan="2" class="cell center strong">{{ index + 1 }}</td>
            <th colspan="3" class="head left">Nombre de la unidad</th>
            <td colspan="4" class="cell">{{ unit.nombre }}</td>
          </tr>
          <tr>
            <th colspan="3" class="head left">Resultados de aprendizaje</th>
            <td colspan="4" class="cell shaded whitespace-pre-wrap">{{ unit.resultado }}</td>
          </tr>
          <tr>
            <th rowspan="3" class="head">Contenidos temáticos de la unidad</th>
            <th rowspan="3" class="head vertical"><span>Semanas ({{ MAX_WEEKS }})</span></th>
            <th colspan="3" class="head">Horas por semana<br>Organización del aprendizaje</th>
            <th colspan="3" class="head">ACTIVIDADES DE APRENDIZAJE</th>
            <th rowspan="3" class="head">Evaluación de los aprendizajes</th>
          </tr>
          <tr>
            <th class="head">DOCENCIA</th>
            <th colspan="2" class="head">ESTUDIANTE</th>
            <th rowspan="2" class="head">Aprendizaje en contacto con el docente (ACD)</th>
            <th rowspan="2" class="head">Aprendizaje práctico-experimental (APE)</th>
            <th rowspan="2" class="head">Aprendizaje autónomo (AA)</th>
          </tr>
          <tr>
            <th class="head">ACD</th><th class="head">APE</th><th class="head">AA</th>
          </tr>
          <tr v-for="(week, w) in unit.semanas" :key="w" :class="{ band: w % 2 === 0 }">
            <td class="cell whitespace-pre-wrap">{{ week.contenidos }}</td>
            <td class="cell center strong">{{ firstWeek(units(), index) + w }}</td>
            <td class="cell center strong">{{ week.acd_h }}</td><td class="cell center strong">{{ week.ape_h }}</td><td class="cell center strong">{{ week.aa_h }}</td>
            <td class="cell whitespace-pre-wrap">{{ week.acd }}</td><td class="cell whitespace-pre-wrap">{{ week.ape }}</td><td class="cell whitespace-pre-wrap">{{ week.aa }}</td>
            <td class="cell whitespace-pre-wrap">{{ week.evaluacion }}</td>
          </tr>
          <tr>
            <th colspan="2" class="head right">Total, horas</th>
            <th class="head">{{ formatHours(unitTotals(unit).acd) }}</th><th class="head">{{ formatHours(unitTotals(unit).ape) }}</th><th class="head">{{ formatHours(unitTotals(unit).aa) }}</th>
            <th colspan="4" class="head" />
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.units-table { width: 100%; table-layout: fixed; border-collapse: collapse; }
.units-table th,
.units-table td { border: 1px solid var(--document-table-line); padding: 2px 4px; vertical-align: top; overflow-wrap: anywhere; }
.units-table .head { background-color: var(--document-table-fill); color: var(--document-table-heading); font-weight: 700; text-align: center; vertical-align: middle; }
.units-table .left { text-align: left; }
.units-table .right { text-align: right; }
.units-table .center { text-align: center; }
.units-table .strong { font-weight: 700; }
.units-table .shaded { background-color: var(--document-table-fill); }
.units-table .band .cell { background-color: color-mix(in srgb, var(--document-table-fill) 35%, transparent); }
.units-table .vertical span { display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; }
</style>
