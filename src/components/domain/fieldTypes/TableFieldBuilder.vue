<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue';
import { nextAxisKey } from '@/components/domain/fieldTypes/builderConfig';
import { tableColumns, tableRows } from '@/components/domain/fieldTypes/tableField';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel, FieldSet, FieldLegend } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { TableAxisItem } from '@/types/configuration';

const props = defineProps<{ modelValue: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:modelValue': [value: Record<string, unknown>] }>();

type Axis = 'columns' | 'rows';
const AXES: Array<{ axis: Axis; legend: string; item: string; prefix: string; add: string }> = [
  { axis: 'columns', legend: 'Columnas', item: 'Columna', prefix: 'columna', add: 'Agregar columna' },
  { axis: 'rows', legend: 'Filas', item: 'Fila', prefix: 'fila', add: 'Agregar fila' },
];
const items = (axis: Axis): TableAxisItem[] => (axis === 'columns' ? tableColumns({ config: props.modelValue }) : tableRows({ config: props.modelValue }));
const set = (axis: Axis, next: TableAxisItem[]): void => emit('update:modelValue', { ...props.modelValue, [axis]: next });
const rename = (axis: Axis, index: number, label: string): void => set(axis, items(axis).map((item, i) => (i === index ? { ...item, label } : item)));
const add = (axis: Axis, prefix: string, name: string): void => {
  const current = items(axis);
  const key = nextAxisKey(current, prefix);
  set(axis, [...current, { key, label: `${name} ${current.length + 1}` }]);
};
const remove = (axis: Axis, index: number): void => set(axis, items(axis).filter((_, i) => i !== index));
const move = (axis: Axis, index: number, direction: -1 | 1): void => {
  const next = [...items(axis)];
  const [item] = next.splice(index, 1);
  next.splice(index + direction, 0, item!);
  set(axis, next);
};
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <FieldSet v-for="group in AXES" :key="group.axis" class="gap-2">
      <FieldLegend variant="label">{{ group.legend }}</FieldLegend>
      <FieldDescription>{{ group.axis === 'rows' ? 'Las filas son fijas: el docente solo llena las celdas.' : 'Los títulos de la tabla.' }}</FieldDescription>
      <Field v-for="(item, index) in items(group.axis)" :key="item.key" orientation="horizontal" class="items-center gap-1">
        <FieldLabel :for="`table-${group.axis}-${item.key}`" class="sr-only">{{ group.item }} {{ index + 1 }}</FieldLabel>
        <Input :id="`table-${group.axis}-${item.key}`" :model-value="item.label" @update:model-value="rename(group.axis, index, String($event))" />
        <Button type="button" variant="ghost" size="icon-sm" :disabled="index === 0" :aria-label="`Subir ${group.item.toLowerCase()} ${index + 1}`" @click="move(group.axis, index, -1)"><ArrowUp aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="index === items(group.axis).length - 1" :aria-label="`Bajar ${group.item.toLowerCase()} ${index + 1}`" @click="move(group.axis, index, 1)"><ArrowDown aria-hidden="true" /></Button>
        <Button type="button" variant="ghost" size="icon-sm" :disabled="items(group.axis).length <= 1" :aria-label="`Quitar ${group.item.toLowerCase()} ${index + 1}`" @click="remove(group.axis, index)"><Trash2 aria-hidden="true" /></Button>
      </Field>
      <Button type="button" variant="outline" size="sm" class="self-start" @click="add(group.axis, group.prefix, group.item)"><Plus data-icon="inline-start" aria-hidden="true" />{{ group.add }}</Button>
    </FieldSet>
  </div>
</template>
