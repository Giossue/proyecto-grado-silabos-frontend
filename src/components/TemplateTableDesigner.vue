<script setup lang="ts">
import { reactive, watch } from "vue";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "@lucide/vue";
import type {
  TemplateNamedItem,
  TemplateTableColumn,
  TemplateTableLayout,
} from "@/api/template";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const props = defineProps<{
  layout: TemplateTableLayout;
  fingerprint: string;
  disabled?: boolean;
  saving?: boolean;
}>();

const emit = defineEmits<{
  save: [payload: TemplateTableLayout & { fingerprint: string }];
}>();

const clone = (layout: TemplateTableLayout): TemplateTableLayout => ({
  columns: layout.columns.map((item) => ({ ...item })),
  groups: layout.groups.map((item) => ({ ...item })),
  bands: layout.bands.map((item) => ({ ...item })),
  header_fields: layout.header_fields.map((item) => ({ ...item })),
  totals: { ...layout.totals },
  repeat: { ...layout.repeat },
});
const form = reactive<TemplateTableLayout>(clone(props.layout));

watch(
  () => props.layout,
  (layout) => Object.assign(form, clone(layout)),
  { deep: true },
);

const nextKey = (prefix: string, items: Array<{ key: string }>): string => {
  let number = items.length + 1;
  while (items.some((item) => item.key === `${prefix}_${number}`)) number += 1;
  return `${prefix}_${number}`;
};

const addNamed = (items: TemplateNamedItem[], prefix: string, label: string): void => {
  items.push({ key: nextKey(prefix, items), label });
};

const removeNamed = (
  items: TemplateNamedItem[],
  index: number,
  property: "group" | "band",
): void => {
  const removed = items[index]?.key;
  items.splice(index, 1);
  if (removed) {
    form.columns.forEach((column) => {
      if (column[property] === removed) column[property] = null;
    });
  }
};

const addColumn = (): void => {
  form.columns.push({
    key: nextKey("columna", form.columns),
    label: "Nueva columna",
    type: "text",
    group: null,
    band: null,
    role: null,
    sum: false,
    width: null,
  });
};

const moveColumn = (index: number, offset: number): void => {
  const target = index + offset;
  if (target < 0 || target >= form.columns.length) return;
  const current = form.columns[index] as TemplateTableColumn;
  form.columns.splice(index, 1);
  form.columns.splice(target, 0, current);
};

const save = (): void => {
  emit("save", { ...clone(form), fingerprint: props.fingerprint });
};
</script>

<template>
  <section class="grid gap-5 border-t pt-5" aria-label="Diseño de tabla">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="grid gap-1">
        <h4 class="font-medium">Estructura de la tabla</h4>
        <p class="text-sm text-muted-foreground">Configure lo que verá y completará el docente, sin editar código.</p>
      </div>
      <Button type="button" size="sm" variant="outline" :disabled="disabled" @click="addColumn"><Plus aria-hidden="true" />Agregar columna</Button>
    </header>

    <div class="grid gap-4">
      <article v-for="(column, index) in form.columns" :key="`${column.key}-${index}`" class="table-column-card grid gap-4 rounded-lg border p-4">
        <div class="table-column-order flex flex-wrap items-center gap-2">
          <strong>Columna {{ index + 1 }}</strong>
          <Button class="ml-auto" type="button" size="icon-sm" variant="ghost" aria-label="Mover columna a la izquierda" :disabled="disabled || index === 0" @click="moveColumn(index, -1)"><ArrowLeft aria-hidden="true" /></Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Mover columna a la derecha" :disabled="disabled || index === form.columns.length - 1" @click="moveColumn(index, 1)"><ArrowRight aria-hidden="true" /></Button>
          <Button type="button" size="icon-sm" variant="ghost" aria-label="Eliminar columna" :disabled="disabled || form.columns.length === 1" @click="form.columns.splice(index, 1)"><Trash2 aria-hidden="true" /></Button>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field><FieldLabel required>Nombre</FieldLabel><Input v-model="column.label" required maxlength="180" :disabled="disabled" /></Field>
          <Field><FieldLabel required>Clave</FieldLabel><Input v-model="column.key" required maxlength="60" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /></Field>
          <Field><FieldLabel>Tipo</FieldLabel><NativeSelect v-model="column.type" class="w-full" :disabled="disabled"><NativeSelectOption value="text">Texto</NativeSelectOption><NativeSelectOption value="number">Número</NativeSelectOption></NativeSelect></Field>
          <Field><FieldLabel>Grupo</FieldLabel><NativeSelect v-model="column.group" class="w-full" :disabled="disabled"><NativeSelectOption :value="null">Sin grupo</NativeSelectOption><NativeSelectOption v-for="group in form.groups" :key="group.key" :value="group.key">{{ group.label }}</NativeSelectOption></NativeSelect></Field>
          <Field><FieldLabel>Banda superior</FieldLabel><NativeSelect v-model="column.band" class="w-full" :disabled="disabled"><NativeSelectOption :value="null">Sin banda</NativeSelectOption><NativeSelectOption v-for="band in form.bands" :key="band.key" :value="band.key">{{ band.label }}</NativeSelectOption></NativeSelect></Field>
          <Field><FieldLabel>Función</FieldLabel><NativeSelect v-model="column.role" class="w-full" :disabled="disabled || column.type !== 'number'"><NativeSelectOption :value="null">Normal</NativeSelectOption><NativeSelectOption value="week">Semana</NativeSelectOption><NativeSelectOption value="hours_acd">Horas ACD</NativeSelectOption><NativeSelectOption value="hours_ape">Horas APE</NativeSelectOption><NativeSelectOption value="hours_aa">Horas AA</NativeSelectOption></NativeSelect></Field>
          <Field><FieldLabel>Ancho relativo</FieldLabel><Input :model-value="column.width ?? undefined" type="number" min="1" max="10000" placeholder="Automático" :disabled="disabled" @update:model-value="column.width = $event === '' || $event === undefined ? null : Number($event)" /></Field>
          <Field v-if="column.type === 'number'" orientation="horizontal" class="checkbox-row items-center"><Checkbox v-model="column.sum" :disabled="disabled" /><FieldLabel>Sumar en totales</FieldLabel></Field>
        </div>
      </article>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <fieldset class="grid content-start gap-3 rounded-lg border p-4">
        <legend class="px-1 text-sm font-medium">Grupos de columnas</legend>
        <div v-for="(group, index) in form.groups" :key="`${group.key}-${index}`" class="grid gap-2"><Input v-model="group.label" aria-label="Nombre del grupo" :disabled="disabled" /><Input v-model="group.key" aria-label="Clave del grupo" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="removeNamed(form.groups, index, 'group')">Quitar</Button></div>
        <Button type="button" size="sm" variant="outline" :disabled="disabled" @click="addNamed(form.groups, 'grupo', 'Nuevo grupo')"><Plus aria-hidden="true" />Agregar grupo</Button>
      </fieldset>
      <fieldset class="grid content-start gap-3 rounded-lg border p-4">
        <legend class="px-1 text-sm font-medium">Bandas superiores</legend>
        <div v-for="(band, index) in form.bands" :key="`${band.key}-${index}`" class="grid gap-2"><Input v-model="band.label" aria-label="Nombre de la banda" :disabled="disabled" /><Input v-model="band.key" aria-label="Clave de la banda" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="removeNamed(form.bands, index, 'band')">Quitar</Button></div>
        <Button type="button" size="sm" variant="outline" :disabled="disabled" @click="addNamed(form.bands, 'banda', 'Nueva banda')"><Plus aria-hidden="true" />Agregar banda</Button>
      </fieldset>
      <fieldset class="grid content-start gap-3 rounded-lg border p-4">
        <legend class="px-1 text-sm font-medium">Datos de cabecera</legend>
        <div v-for="(item, index) in form.header_fields" :key="`${item.key}-${index}`" class="grid gap-2"><Input v-model="item.label" aria-label="Nombre del dato" :disabled="disabled" /><Input v-model="item.key" aria-label="Clave del dato" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><Button type="button" size="sm" variant="ghost" :disabled="disabled" @click="form.header_fields.splice(index, 1)">Quitar</Button></div>
        <Button type="button" size="sm" variant="outline" :disabled="disabled" @click="addNamed(form.header_fields, 'cabecera', 'Nuevo dato')"><Plus aria-hidden="true" />Agregar dato</Button>
      </fieldset>
    </div>

    <div class="grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
      <Field orientation="horizontal" class="checkbox-row items-center"><Checkbox v-model="form.totals.enabled" :disabled="disabled" /><FieldLabel>Mostrar fila de totales</FieldLabel></Field>
      <Field v-if="form.totals.enabled"><FieldLabel>Etiqueta del total</FieldLabel><Input v-model="form.totals.label" maxlength="180" :disabled="disabled" /></Field>
      <Field orientation="horizontal" class="checkbox-row items-center"><Checkbox v-model="form.repeat.enabled" :disabled="disabled" /><FieldLabel>Repetir por unidad</FieldLabel></Field>
      <Field v-if="form.repeat.enabled"><FieldLabel>Nombre de cada unidad</FieldLabel><Input v-model="form.repeat.label" maxlength="180" :disabled="disabled" /></Field>
    </div>
    <Button class="w-fit" type="button" :disabled="disabled || saving" @click="save">{{ saving ? "Guardando…" : "Guardar estructura de tabla" }}</Button>
  </section>
</template>
