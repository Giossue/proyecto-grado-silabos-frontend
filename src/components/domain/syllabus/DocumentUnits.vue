<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emptyWeek, plannedHours, PLANNING_WEEKS, type PlanningUnit, type UnitWeek } from '@/lib/templateDocument';

const props = defineProps<{ units: PlanningUnit[]; hours: { acd: number; ape: number; aa: number } | null; interactive: boolean }>();
const emit = defineEmits<{ update: [units: PlanningUnit[]] }>();

const weekCount = computed(() => props.units.reduce((sum, unit) => sum + unit.semanas.length, 0));
const planned = computed(() => plannedHours(props.units));
const targets = computed(() => props.hours ? [
  { key: 'acd' as const, label: 'ACD', planned: planned.value.acd, target: props.hours.acd },
  { key: 'ape' as const, label: 'APE', planned: planned.value.ape, target: props.hours.ape },
  { key: 'aa' as const, label: 'AA', planned: planned.value.aa, target: props.hours.aa },
] : []);
const fmt = (value: number): string => String(Math.round(value * 100) / 100);
const ok = (planned: number, target: number): boolean => Math.abs(planned - target) < 0.001;

const clone = (): PlanningUnit[] => props.units.map((unit) => ({ ...unit, semanas: unit.semanas.map((week) => ({ ...week })) }));
const setUnit = (index: number, changes: Partial<Pick<PlanningUnit, 'nombre' | 'resultado'>>): void => {
  const next = clone();
  next[index] = { ...next[index]!, ...changes };
  emit('update', next);
};
const setWeek = (unit: number, week: number, key: keyof UnitWeek, text: string): void => {
  const next = clone();
  next[unit]!.semanas[week] = { ...next[unit]!.semanas[week]!, [key]: text };
  emit('update', next);
};
const addWeek = (unit: number): void => {
  if (weekCount.value >= PLANNING_WEEKS) return;
  const next = clone();
  next[unit]!.semanas.push(emptyWeek());
  emit('update', next);
};
const removeWeek = (unit: number, week: number): void => {
  const next = clone();
  next[unit]!.semanas.splice(week, 1);
  emit('update', next);
};
const firstWeek = (unit: number): number => props.units.slice(0, unit).reduce((sum, item) => sum + item.semanas.length, 0) + 1;
const columns: Array<{ key: keyof UnitWeek; label: string; narrow?: boolean }> = [
  { key: 'contenidos', label: 'Contenidos temáticos' },
  { key: 'acd_h', label: 'ACD', narrow: true },
  { key: 'ape_h', label: 'APE', narrow: true },
  { key: 'aa_h', label: 'AA', narrow: true },
  { key: 'acd', label: 'Aprendizaje en contacto con el docente (ACD)' },
  { key: 'ape', label: 'Aprendizaje práctico-experimental (APE)' },
  { key: 'aa', label: 'Aprendizaje autónomo (AA)' },
  { key: 'evaluacion', label: 'Evaluación de los aprendizajes' },
];
const activityLabels = ['Aprendizaje en contacto con el docente (ACD)', 'Aprendizaje práctico-experimental (APE)', 'Aprendizaje autónomo (AA)'];
</script>

<template>
  <div data-units class="flex flex-col gap-3">
    <div v-if="interactive" data-units-summary class="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm" aria-live="polite">
      <span :class="weekCount === PLANNING_WEEKS ? 'text-success' : 'text-destructive'">Semanas {{ weekCount }} de {{ PLANNING_WEEKS }}</span>
      <span v-for="item in targets" :key="item.key" :class="ok(item.planned, item.target) ? 'text-success' : 'text-destructive'">{{ item.label }} {{ fmt(item.planned) }} de {{ fmt(item.target) }}</span>
      <span class="text-muted-foreground">Las horas deben coincidir con las de la asignatura para poder enviar</span>
    </div>

    <table v-for="(unit, unitIndex) in units" :key="unitIndex" class="free-text-table w-full" :data-unit="unitIndex + 1">
      <tbody>
        <tr><th colspan="2">Unidad No. {{ unitIndex + 1 }}</th><th colspan="7"><Input v-if="interactive" :model-value="unit.nombre" maxlength="1000" :aria-label="`Nombre de la unidad ${unitIndex + 1}`" placeholder="Nombre de la unidad" @update:model-value="setUnit(unitIndex, { nombre: String($event) })" /><span v-else>{{ unit.nombre }}</span></th><th v-if="interactive" class="w-10"><span class="sr-only">Acciones</span></th></tr>
        <tr><th colspan="2">Resultados de aprendizaje</th><th colspan="7"><Input v-if="interactive" :model-value="unit.resultado" maxlength="1000" :aria-label="`Resultados de aprendizaje de la unidad ${unitIndex + 1}`" placeholder="Resultados de aprendizaje" @update:model-value="setUnit(unitIndex, { resultado: String($event) })" /><span v-else>{{ unit.resultado }}</span></th><th v-if="interactive" /></tr>
        <tr><th rowspan="3">Contenidos temáticos</th><th rowspan="3">Semana</th><th colspan="3">Horas por semana</th><th colspan="3">Actividades de aprendizaje</th><th rowspan="3">Evaluación de los aprendizajes</th><th v-if="interactive" rowspan="3" /></tr>
        <tr><th colspan="3">Organización del aprendizaje</th><th v-for="label in activityLabels" :key="label" rowspan="2">{{ label }}</th></tr>
        <tr><th class="w-12">ACD</th><th class="w-12">APE</th><th class="w-12">AA</th></tr>
        <tr v-for="(week, weekIndex) in unit.semanas" :key="weekIndex" class="h-8">
          <template v-for="column in columns" :key="column.key">
            <td>
              <Input v-if="interactive" :model-value="week[column.key]" :maxlength="column.narrow ? 6 : 1000" :inputmode="column.narrow ? 'decimal' : undefined" :class="column.narrow ? 'h-7 w-12 px-1 py-0 text-center' : 'h-7 px-2 py-0'" :aria-label="`${column.label}, semana ${firstWeek(unitIndex) + weekIndex}`" @update:model-value="setWeek(unitIndex, weekIndex, column.key, String($event))" />
              <span v-else>{{ week[column.key] }}</span>
            </td>
            <td v-if="column.key === 'contenidos'" class="text-center">{{ firstWeek(unitIndex) + weekIndex }}</td>
          </template>
          <td v-if="interactive"><Button type="button" variant="ghost" size="icon-sm" :aria-label="`Quitar la semana ${firstWeek(unitIndex) + weekIndex}`" @click="removeWeek(unitIndex, weekIndex)"><Trash2 aria-hidden="true" /></Button></td>
        </tr>
      </tbody>
      <tfoot v-if="interactive">
        <tr><td :colspan="10"><Button type="button" variant="outline" size="sm" :disabled="weekCount >= PLANNING_WEEKS" :aria-label="`Agregar una semana a la unidad ${unitIndex + 1}`" @click="addWeek(unitIndex)"><Plus data-icon="inline-start" aria-hidden="true" />Agregar semana</Button></td></tr>
      </tfoot>
    </table>
  </div>
</template>
