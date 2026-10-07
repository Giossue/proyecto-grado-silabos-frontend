<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue';
import { emptyWeek, firstWeek, formatHours, MAX_UNITS, MAX_WEEKS, totalWeeks, unitsOf, unitTotals } from '@/components/domain/fieldTypes/unitsField';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { TypedField, UnitsValue, UnitWeek } from '@/types/configuration';

const props = defineProps<{ field: TypedField; modelValue: unknown; id?: string; disabled?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: UnitsValue] }>();
const units = (): UnitsValue => unitsOf(props.modelValue);
const set = (next: UnitsValue): void => emit('update:modelValue', next);
const addUnit = (): void => set([...units(), { nombre: '', resultado: '', semanas: [emptyWeek()] }]);
const removeUnit = (index: number): void => set(units().filter((_, i) => i !== index));
const patchUnit = (index: number, patch: Partial<Pick<UnitsValue[number], 'nombre' | 'resultado'>>): void =>
    set(units().map((unit, i) => (i === index ? { ...unit, ...patch } : unit)));
const addWeek = (index: number): void => set(units().map((unit, i) => (i === index ? { ...unit, semanas: [...unit.semanas, emptyWeek()] } : unit)));
const removeWeek = (index: number, week: number): void => set(units().map((unit, i) => (i === index ? { ...unit, semanas: unit.semanas.filter((_, w) => w !== week) } : unit)));
const patchWeek = (index: number, week: number, key: keyof UnitWeek, text: string): void =>
    set(units().map((unit, i) => (i === index ? { ...unit, semanas: unit.semanas.map((item, w) => (w === week ? { ...item, [key]: text } : item)) } : unit)));
const weekFields: Array<{ key: keyof UnitWeek; label: string }> = [
    { key: 'acd', label: 'Aprendizaje en contacto con el docente (ACD)' },
    { key: 'ape', label: 'Aprendizaje práctico-experimental (APE)' },
    { key: 'aa', label: 'Aprendizaje autónomo (AA)' },
    { key: 'evaluacion', label: 'Evaluación de los aprendizajes' },
];
const hourFields: Array<{ key: keyof UnitWeek; label: string }> = [
    { key: 'acd_h', label: 'Horas ACD' },
    { key: 'ape_h', label: 'Horas APE' },
    { key: 'aa_h', label: 'Horas AA' },
];
</script>

<template>
  <div :id="id ?? `input-${field.id ?? field.key}`" class="units-field-editor flex flex-col gap-6">
    <p v-if="units().length === 0" class="text-sm text-muted-foreground">Agregue la primera unidad. Cada unidad lleva su nombre, sus resultados de aprendizaje y una fila por semana ({{ MAX_WEEKS }} semanas en total).</p>
    <section v-for="(unit, index) in units()" :key="index" class="flex flex-col gap-4 rounded-lg border p-4" :aria-label="`Unidad ${index + 1}`">
      <header class="flex items-center justify-between gap-2">
        <h3 class="font-medium">Unidad No. {{ index + 1 }}</h3>
        <Button type="button" variant="ghost" size="sm" :disabled="disabled" :aria-label="`Quitar la unidad ${index + 1}`" @click="removeUnit(index)"><Trash2 aria-hidden="true" />Quitar unidad</Button>
      </header>
      <Field>
        <FieldLabel :for="`unit-${index}-name`">Nombre de la unidad</FieldLabel>
        <Input :id="`unit-${index}-name`" :model-value="unit.nombre" :disabled="disabled" @update:model-value="patchUnit(index, { nombre: String($event) })" />
      </Field>
      <Field>
        <FieldLabel :for="`unit-${index}-result`">Resultados de aprendizaje</FieldLabel>
        <Textarea :id="`unit-${index}-result`" :model-value="unit.resultado" :disabled="disabled" rows="2" @update:model-value="patchUnit(index, { resultado: String($event) })" />
      </Field>
      <div class="flex flex-col gap-3">
        <article v-for="(week, w) in unit.semanas" :key="w" class="flex flex-col gap-3 rounded-md bg-muted/40 p-3" :aria-label="`Semana ${firstWeek(units(), index) + w}`">
          <div class="flex items-center justify-between gap-2">
            <h4 class="text-sm font-medium">Semana {{ firstWeek(units(), index) + w }}</h4>
            <Button type="button" variant="ghost" size="sm" :disabled="disabled || unit.semanas.length === 1" :aria-label="`Quitar la semana ${firstWeek(units(), index) + w}`" @click="removeWeek(index, w)"><Trash2 aria-hidden="true" />Quitar</Button>
          </div>
          <Field>
            <FieldLabel :for="`unit-${index}-week-${w}-contenidos`">Contenidos temáticos</FieldLabel>
            <Textarea :id="`unit-${index}-week-${w}-contenidos`" :model-value="week.contenidos" :disabled="disabled" rows="2" @update:model-value="patchWeek(index, w, 'contenidos', String($event))" />
          </Field>
          <div class="grid grid-cols-3 gap-3">
            <Field v-for="item in hourFields" :key="item.key">
              <FieldLabel :for="`unit-${index}-week-${w}-${item.key}`">{{ item.label }}</FieldLabel>
              <Input :id="`unit-${index}-week-${w}-${item.key}`" :model-value="week[item.key]" :disabled="disabled" inputmode="decimal" @update:model-value="patchWeek(index, w, item.key, String($event))" />
            </Field>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <Field v-for="item in weekFields" :key="item.key">
              <FieldLabel :for="`unit-${index}-week-${w}-${item.key}`">{{ item.label }}</FieldLabel>
              <Textarea :id="`unit-${index}-week-${w}-${item.key}`" :model-value="week[item.key]" :disabled="disabled" rows="2" @update:model-value="patchWeek(index, w, item.key, String($event))" />
            </Field>
          </div>
        </article>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" :disabled="disabled || totalWeeks(units()) >= MAX_WEEKS" @click="addWeek(index)"><Plus aria-hidden="true" />Agregar semana</Button>
          <p class="text-sm text-muted-foreground">Total, horas: ACD {{ formatHours(unitTotals(unit).acd) }} · APE {{ formatHours(unitTotals(unit).ape) }} · AA {{ formatHours(unitTotals(unit).aa) }}</p>
        </div>
      </div>
    </section>
    <div><Button type="button" variant="outline" :disabled="disabled || units().length >= MAX_UNITS || totalWeeks(units()) >= MAX_WEEKS" @click="addUnit"><Plus aria-hidden="true" />Agregar unidad</Button></div>
  </div>
</template>
