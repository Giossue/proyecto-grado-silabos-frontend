<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue';
import { computed, ref, useId, watch } from 'vue';
import { ApiError } from '@/api/client';
import { designRepeatableTable, type DesignedTable, type RepeatableTableCellType, type RepeatableTableColumn, type RepeatableTableDesign } from '@/api/template';
import IconTooltip from '@/components/domain/IconTooltip.vue';
import ResponseOptionsEditor from '@/components/domain/syllabus/ResponseOptionsEditor.vue';
import { uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ResponseOption } from '@/lib/responseKinds';

const props = defineProps<{ templateId: string; design: RepeatableTableDesign | null; reason?: string | null; name?: string; takenKinds: string[] }>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ applied: [table: DesignedTable, created: boolean] }>();

type Draft = Omit<RepeatableTableDesign, 'min' | 'max' | 'initial' | 'columns'> & { min: string; max: string; initial: string; columns: ColumnDraft[] };
type ColumnDraft = Omit<RepeatableTableColumn, 'max_length' | 'maximum' | 'decimals' | 'width'> & { id: number; max_length: string; maximum: string; decimals: string; width: string };

const CELL_TYPES: Array<{ value: RepeatableTableCellType; label: string }> = [
    { value: 'text', label: 'Texto' },
    { value: 'choice', label: 'Elegir una' },
    { value: 'number', label: 'Número' },
];
const DECIMALS = ['0', '1', '2', '3'];
const id = useId();
let nextId = 0;
const text = (value: number | null | undefined, fallback = ''): string => (value === null || value === undefined ? fallback : String(value));
const toColumn = (column: RepeatableTableColumn): ColumnDraft => ({
    ...column,
    id: nextId += 1,
    options: column.options?.map((option) => ({ ...option })) ?? [],
    max_length: text(column.max_length, '1000'),
    multiline: column.multiline ?? false,
    maximum: text(column.maximum, '999.99'),
    decimals: text(column.decimals, '2'),
    width: text(column.width),
});
const blankColumn = (position: number): ColumnDraft => toColumn({ title: `Columna ${position}`, type: 'text', max_length: 1000, multiline: false, width: null, required: false });
const fromDesign = (design: RepeatableTableDesign | null): Draft => design
    ? { ...design, min: String(design.min), max: String(design.max), initial: String(design.initial), columns: design.columns.map(toColumn) }
    : { kind: '', label: '', list: '', item: 'fila', min: '1', max: '20', initial: '1', band: null, columns: [blankColumn(1)] };

const draft = ref<Draft>(fromDesign(props.design));
const errors = ref<Record<string, string[]>>({});
const general = ref<string | null>(null);
const busy = ref(false);
const readOnly = computed(() => Boolean(props.reason));
const creating = computed(() => props.design === null && !readOnly.value);
watch(open, (value) => {
    if (!value) return;
    draft.value = fromDesign(props.design);
    errors.value = {};
    general.value = null;
});

const whole = (value: string): number | string => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : value.trim());
const decimal = (value: string): number | string => (/^\d+([.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : value.trim());
const columnPayload = (column: ColumnDraft): RepeatableTableColumn => {
    const base = { ...(column.key ? { key: column.key } : {}), title: column.title.trim(), type: column.type, width: column.width.trim() === '' ? null : whole(column.width) as number, required: column.required };
    if (column.type === 'choice') return { ...base, options: (column.options ?? []).map((option) => ({ ...(option.value ? { value: option.value } : {}), label: option.label })) };
    if (column.type === 'number') return { ...base, maximum: decimal(column.maximum) as number, decimals: whole(column.decimals) as number };
    return { ...base, max_length: whole(column.max_length) as number, multiline: column.multiline ?? false };
};
const payload = (): RepeatableTableDesign => ({
    kind: draft.value.kind,
    label: draft.value.label.trim(),
    list: draft.value.list,
    item: draft.value.item.trim(),
    min: whole(draft.value.min) as number,
    max: whole(draft.value.max) as number,
    initial: whole(draft.value.initial) as number,
    band: draft.value.band,
    columns: draft.value.columns.map(columnPayload),
    ...(draft.value.extras ? { extras: draft.value.extras } : {}),
});

const optionsOf = (column: ColumnDraft): ResponseOption[] => (column.options ?? []).map((option, index) => ({ const: option.value ?? `o${index + 1}`, title: option.label }));
const setOptions = (column: ColumnDraft, options: ResponseOption[]): void => {
    column.options = options.map((option) => ({ value: option.const, label: option.title }));
};
const addColumn = (): void => { draft.value.columns.push(blankColumn(draft.value.columns.length + 1)); };
const removeColumn = (index: number): void => { draft.value.columns.splice(index, 1); };
const moveColumn = (index: number, step: number): void => {
    const columns = draft.value.columns;
    const [column] = columns.splice(index, 1);
    if (column) columns.splice(index + step, 0, column);
};
const errorOf = (path: string): string[] | undefined => errors.value[path];
const columnErrors = (index: number, name: string): string[] | undefined => errors.value[`columns.${index}.${name}`];

const previewRows = computed(() => Math.max(1, Math.min(5, Number(whole(draft.value.initial)) || 1)));
const cellHint = (column: ColumnDraft): string => {
    if (column.type === 'choice') return (column.options ?? []).map((option) => option.label).filter(Boolean).join(' / ') || 'Elegir una';
    if (column.type === 'number') return 'Número';
    return column.multiline ? 'Texto largo' : 'Texto';
};
const limitsLabel = computed(() => `Entre ${draft.value.min || 0} y ${draft.value.max || 0} filas; el docente usa «Agregar ${draft.value.item.trim() || 'fila'}».`);

const friendly = (message: string): string => {
    const match = /\.catalog\.map\.([a-z_]+): /.exec(message);
    const catalog = props.design?.extras?.catalog as { map?: Record<string, string> } | undefined;
    const key = match ? catalog?.map?.[match[1]!] : undefined;
    const column = key ? props.design?.columns.find((item) => item.key === key) : undefined;
    if (!column) return message;
    return draft.value.columns.some((item) => item.key === key)
        ? `La búsqueda en biblioteca usa la columna «${column.title}»: debe seguir siendo de texto.`
        : `La búsqueda en biblioteca usa la columna «${column.title}»: no se puede quitar.`;
};
const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)]));
    return value;
};
const same = (a: unknown, b: unknown): boolean => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

const apply = async (): Promise<void> => {
    if (busy.value || readOnly.value) return;
    const body = payload();
    if (!creating.value && props.design && same(body, props.design)) {
        open.value = false;
        return;
    }
    if (creating.value) body.kind = uniqueKey(`tabla ${body.label}`, 'tabla', props.takenKinds).slice(0, 40);
    busy.value = true;
    errors.value = {};
    general.value = null;
    try {
        const table = await designRepeatableTable(props.templateId, { ...body, ...(creating.value ? { new: true } : {}) });
        emit('applied', table, creating.value);
        open.value = false;
    } catch (reason) {
        if (reason instanceof ApiError && reason.status === 422) {
            errors.value = reason.errors;
            const known = Object.keys(reason.errors).filter((path) => path !== 'definition' && path !== 'kind');
            general.value = [...(reason.errors.definition ?? []).map(friendly), ...(reason.errors.kind ?? [])].join(' ') || (known.length ? null : reason.message);
        } else {
            general.value = 'No se pudo preparar la tabla';
        }
    } finally {
        busy.value = false;
    }
};
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-(--overlay-max-height) overflow-y-auto sm:max-w-3xl" data-table-designer>
      <DialogHeader>
        <DialogTitle>{{ creating ? 'Nueva tabla repetible' : `Tabla repetible: ${design?.label ?? name ?? ''}` }}</DialogTitle>
        <DialogDescription>El docente agrega filas y llena cada celda según su tipo.</DialogDescription>
      </DialogHeader>

      <Alert v-if="readOnly" data-table-designer-readonly><AlertDescription>{{ reason }}</AlertDescription></Alert>

      <form v-else :id="`${id}-form`" novalidate class="flex flex-col gap-6" @submit.prevent="apply">
        <Alert v-if="general" variant="destructive" role="alert" data-table-designer-error><AlertDescription>{{ general }}</AlertDescription></Alert>
        <FieldGroup class="grid gap-4 sm:grid-cols-2">
          <Field :data-invalid="errorOf('label') ? true : undefined">
            <FieldLabel :for="`${id}-label`">Título de la tabla</FieldLabel>
            <Input :id="`${id}-label`" v-model="draft.label" maxlength="120" data-table-label />
            <FieldError :errors="errorOf('label')" />
          </Field>
          <Field :data-invalid="errorOf('item') ? true : undefined">
            <FieldLabel :for="`${id}-item`">Cada fila se llama</FieldLabel>
            <Input :id="`${id}-item`" v-model="draft.item" maxlength="60" data-table-item />
            <FieldDescription>En singular, por ejemplo «práctica»</FieldDescription>
            <FieldError :errors="errorOf('item')" />
          </Field>
        </FieldGroup>
        <FieldGroup class="grid gap-4 sm:grid-cols-3">
          <Field :data-invalid="errorOf('min') ? true : undefined">
            <FieldLabel :for="`${id}-min`">Mínimo de filas</FieldLabel>
            <Input :id="`${id}-min`" v-model="draft.min" inputmode="numeric" data-table-min />
            <FieldError :errors="errorOf('min')" />
          </Field>
          <Field :data-invalid="errorOf('max') ? true : undefined">
            <FieldLabel :for="`${id}-max`">Máximo de filas</FieldLabel>
            <Input :id="`${id}-max`" v-model="draft.max" inputmode="numeric" data-table-max />
            <FieldError :errors="errorOf('max')" />
          </Field>
          <Field :data-invalid="errorOf('initial') ? true : undefined">
            <FieldLabel :for="`${id}-initial`">Filas al empezar</FieldLabel>
            <Input :id="`${id}-initial`" v-model="draft.initial" inputmode="numeric" data-table-initial />
            <FieldError :errors="errorOf('initial')" />
          </Field>
        </FieldGroup>

        <section class="flex flex-col gap-3" aria-label="Columnas">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium">Columnas</h3>
            <Button type="button" variant="outline" size="sm" :disabled="draft.columns.length >= 24" data-table-add-column @click="addColumn"><Plus data-icon="inline-start" aria-hidden="true" />Agregar columna</Button>
          </div>
          <FieldError :errors="errorOf('columns')" />
          <ol class="flex flex-col gap-3">
            <li v-for="(column, index) in draft.columns" :key="column.id" class="rounded-md p-3 ring-1 ring-border" data-table-column>
              <div class="flex flex-wrap items-start gap-3">
                <Field class="min-w-40 flex-1" :data-invalid="columnErrors(index, 'title') ? true : undefined">
                  <FieldLabel :for="`${id}-title-${column.id}`">Nombre</FieldLabel>
                  <Input :id="`${id}-title-${column.id}`" v-model="column.title" maxlength="300" data-column-title />
                  <FieldError :errors="columnErrors(index, 'title')" />
                </Field>
                <Field class="w-40">
                  <FieldLabel :for="`${id}-type-${column.id}`">Tipo de celda</FieldLabel>
                  <Select v-model="column.type">
                    <SelectTrigger :id="`${id}-type-${column.id}`" data-column-type><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectItem v-for="type in CELL_TYPES" :key="type.value" :value="type.value">{{ type.label }}</SelectItem></SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field class="w-28" :data-invalid="columnErrors(index, 'width') ? true : undefined">
                  <FieldLabel :for="`${id}-width-${column.id}`">Ancho (px)</FieldLabel>
                  <Input :id="`${id}-width-${column.id}`" v-model="column.width" inputmode="numeric" placeholder="Auto" data-column-width />
                  <FieldError :errors="columnErrors(index, 'width')" />
                </Field>
                <div class="flex items-center gap-0.5 self-end pb-1">
                  <IconTooltip label="Subir columna"><Button type="button" variant="ghost" size="icon-sm" aria-label="Subir columna" :disabled="index === 0" @click="moveColumn(index, -1)"><ArrowUp aria-hidden="true" /></Button></IconTooltip>
                  <IconTooltip label="Bajar columna"><Button type="button" variant="ghost" size="icon-sm" aria-label="Bajar columna" :disabled="index === draft.columns.length - 1" @click="moveColumn(index, 1)"><ArrowDown aria-hidden="true" /></Button></IconTooltip>
                  <IconTooltip label="Quitar columna"><Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar columna" :disabled="draft.columns.length === 1" data-column-remove @click="removeColumn(index)"><Trash2 aria-hidden="true" /></Button></IconTooltip>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-start gap-4">
                <template v-if="column.type === 'text'">
                  <Field class="w-36" :data-invalid="columnErrors(index, 'max_length') ? true : undefined">
                    <FieldLabel :for="`${id}-length-${column.id}`">Máx. caracteres</FieldLabel>
                    <Input :id="`${id}-length-${column.id}`" v-model="column.max_length" inputmode="numeric" data-column-length />
                    <FieldError :errors="columnErrors(index, 'max_length')" />
                  </Field>
                  <Field orientation="horizontal" class="w-fit self-end pb-2">
                    <Switch :id="`${id}-multiline-${column.id}`" v-model="column.multiline" />
                    <FieldLabel :for="`${id}-multiline-${column.id}`">Varias líneas</FieldLabel>
                  </Field>
                </template>
                <Field v-else-if="column.type === 'choice'" class="min-w-56 flex-1" :data-invalid="columnErrors(index, 'options') ? true : undefined">
                  <FieldLabel>Opciones</FieldLabel>
                  <ResponseOptionsEditor :model-value="optionsOf(column)" @update:model-value="setOptions(column, $event)" />
                  <FieldError :errors="columnErrors(index, 'options')" />
                </Field>
                <template v-else>
                  <Field class="w-32" :data-invalid="columnErrors(index, 'maximum') ? true : undefined">
                    <FieldLabel :for="`${id}-maximum-${column.id}`">Número máximo</FieldLabel>
                    <Input :id="`${id}-maximum-${column.id}`" v-model="column.maximum" inputmode="decimal" data-column-maximum />
                    <FieldError :errors="columnErrors(index, 'maximum')" />
                  </Field>
                  <Field class="w-28">
                    <FieldLabel :for="`${id}-decimals-${column.id}`">Decimales</FieldLabel>
                    <Select v-model="column.decimals">
                      <SelectTrigger :id="`${id}-decimals-${column.id}`"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup><SelectItem v-for="digits in DECIMALS" :key="digits" :value="digits">{{ digits }}</SelectItem></SelectGroup></SelectContent>
                    </Select>
                  </Field>
                </template>
                <Field orientation="horizontal" class="ml-auto w-fit self-end pb-2">
                  <Switch :id="`${id}-required-${column.id}`" v-model="column.required" data-column-required />
                  <FieldLabel :for="`${id}-required-${column.id}`">Obligatoria</FieldLabel>
                </Field>
              </div>
            </li>
          </ol>
        </section>

        <section class="flex flex-col gap-2" aria-label="Vista previa de la tabla">
          <h3 class="text-sm font-medium">Vista previa</h3>
          <Table class="table-fixed" data-table-preview>
            <TableHeader>
              <TableRow>
                <TableHead v-for="column in draft.columns" :key="column.id" class="bg-muted" :style="column.width.trim() && /^\d+$/.test(column.width.trim()) ? { width: `${column.width.trim()}px` } : undefined">{{ column.title || 'Sin nombre' }}<span v-if="column.required" class="text-destructive" aria-label="obligatoria"> *</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in previewRows" :key="row">
                <TableCell v-for="column in draft.columns" :key="column.id" class="truncate text-muted-foreground">{{ cellHint(column) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p class="text-sm text-muted-foreground" data-table-limits>{{ limitsLabel }}</p>
        </section>
      </form>

      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">{{ readOnly ? 'Cerrar' : 'Cancelar' }}</Button></DialogClose>
        <Button v-if="!readOnly" type="submit" :form="`${id}-form`" :disabled="busy" data-table-apply><Spinner v-if="busy" data-icon="inline-start" />{{ creating ? 'Insertar tabla' : 'Aplicar cambios' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
