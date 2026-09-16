<script setup lang="ts">
import { reactive, watch } from "vue";
import type {
  TemplateNamedItem,
  TemplateTableColumn,
  TemplateTableLayout,
} from "@/api/template";

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
  <section class="table-designer" aria-label="Diseño de tabla">
    <header>
      <div>
        <h4>Estructura de la tabla</h4>
        <p>Configure lo que verá y completará el docente, sin editar código.</p>
      </div>
      <button type="button" :disabled="disabled" @click="addColumn">Agregar columna</button>
    </header>

    <div class="table-designer-list">
      <article v-for="(column, index) in form.columns" :key="`${column.key}-${index}`" class="table-column-card">
        <div class="table-column-order">
          <strong>Columna {{ index + 1 }}</strong>
          <button type="button" aria-label="Mover columna a la izquierda" :disabled="disabled || index === 0" @click="moveColumn(index, -1)">←</button>
          <button type="button" aria-label="Mover columna a la derecha" :disabled="disabled || index === form.columns.length - 1" @click="moveColumn(index, 1)">→</button>
          <button type="button" :disabled="disabled || form.columns.length === 1" @click="form.columns.splice(index, 1)">Eliminar</button>
        </div>
        <div class="form-grid">
          <label>Nombre<input v-model="column.label" required maxlength="180" :disabled="disabled" /></label>
          <label>Clave<input v-model="column.key" required maxlength="60" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /></label>
          <label>Tipo<select v-model="column.type" :disabled="disabled"><option value="text">Texto</option><option value="number">Número</option></select></label>
          <label>Grupo<select v-model="column.group" :disabled="disabled"><option :value="null">Sin grupo</option><option v-for="group in form.groups" :key="group.key" :value="group.key">{{ group.label }}</option></select></label>
          <label>Banda superior<select v-model="column.band" :disabled="disabled"><option :value="null">Sin banda</option><option v-for="band in form.bands" :key="band.key" :value="band.key">{{ band.label }}</option></select></label>
          <label>Función<select v-model="column.role" :disabled="disabled || column.type !== 'number'"><option :value="null">Normal</option><option value="week">Semana</option><option value="hours_acd">Horas ACD</option><option value="hours_ape">Horas APE</option><option value="hours_aa">Horas AA</option></select></label>
          <label>Ancho relativo<input v-model.number="column.width" type="number" min="1" max="10000" placeholder="Automático" :disabled="disabled" /></label>
          <label v-if="column.type === 'number'" class="checkbox-row"><input v-model="column.sum" type="checkbox" :disabled="disabled" /> Sumar en totales</label>
        </div>
      </article>
    </div>

    <div class="table-designer-options">
      <fieldset>
        <legend>Grupos de columnas</legend>
        <div v-for="(group, index) in form.groups" :key="`${group.key}-${index}`" class="inline-editor"><input v-model="group.label" aria-label="Nombre del grupo" :disabled="disabled" /><input v-model="group.key" aria-label="Clave del grupo" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><button type="button" :disabled="disabled" @click="removeNamed(form.groups, index, 'group')">Quitar</button></div>
        <button type="button" :disabled="disabled" @click="addNamed(form.groups, 'grupo', 'Nuevo grupo')">Agregar grupo</button>
      </fieldset>
      <fieldset>
        <legend>Bandas superiores</legend>
        <div v-for="(band, index) in form.bands" :key="`${band.key}-${index}`" class="inline-editor"><input v-model="band.label" aria-label="Nombre de la banda" :disabled="disabled" /><input v-model="band.key" aria-label="Clave de la banda" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><button type="button" :disabled="disabled" @click="removeNamed(form.bands, index, 'band')">Quitar</button></div>
        <button type="button" :disabled="disabled" @click="addNamed(form.bands, 'banda', 'Nueva banda')">Agregar banda</button>
      </fieldset>
      <fieldset>
        <legend>Datos de cabecera</legend>
        <div v-for="(item, index) in form.header_fields" :key="`${item.key}-${index}`" class="inline-editor"><input v-model="item.label" aria-label="Nombre del dato" :disabled="disabled" /><input v-model="item.key" aria-label="Clave del dato" pattern="[a-z][a-z0-9_]*" :disabled="disabled" /><button type="button" :disabled="disabled" @click="form.header_fields.splice(index, 1)">Quitar</button></div>
        <button type="button" :disabled="disabled" @click="addNamed(form.header_fields, 'cabecera', 'Nuevo dato')">Agregar dato</button>
      </fieldset>
    </div>

    <div class="table-designer-flags">
      <label class="checkbox-row"><input v-model="form.totals.enabled" type="checkbox" :disabled="disabled" /> Mostrar fila de totales</label>
      <label v-if="form.totals.enabled">Etiqueta del total<input v-model="form.totals.label" maxlength="180" :disabled="disabled" /></label>
      <label class="checkbox-row"><input v-model="form.repeat.enabled" type="checkbox" :disabled="disabled" /> Repetir por unidad</label>
      <label v-if="form.repeat.enabled">Nombre de cada unidad<input v-model="form.repeat.label" maxlength="180" :disabled="disabled" /></label>
    </div>
    <button type="button" :disabled="disabled || saving" @click="save">{{ saving ? "Guardando…" : "Guardar estructura de tabla" }}</button>
  </section>
</template>
