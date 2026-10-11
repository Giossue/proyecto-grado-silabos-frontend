<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/vue-3';
import { Plus, Trash2, X } from '@lucide/vue';
import DocumentIdentification from '@/components/domain/syllabus/DocumentIdentification';
import { computed, useId } from 'vue';
import BooleanChoice from '@/components/domain/BooleanChoice.vue';
import { uniqueKey } from '@/components/domain/configuration/templateStructure';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { blockOf, MAX_BLOCK_COLUMNS, type BlockColumn, type BlockProps, type BlockValue, type Disability, type DocumentNode } from '@/lib/templateDocument';

const props = defineProps<NodeViewProps>();
const followUpId = useId();

const configuring = computed(() => props.extension.options.mode === 'configure' && props.editor.isEditable);
const filling = computed(() => props.editor.isEditable);
const block = computed(() => blockOf(props.node as unknown as DocumentNode));
const kind = computed(() => block.value.kind);
const withRows = computed(() => kind.value === 'repetible' || (block.value.value.answer === 'si' && block.value.props.columns.length > 0));

const setProps = (changes: Partial<BlockProps>): void => props.updateAttributes({ props: { ...block.value.props, ...changes } });
const setValue = (changes: Partial<BlockValue>): void => props.updateAttributes({ value: { ...block.value.value, ...changes } });

const setAnswer = (answer: boolean): void => setValue({ answer: answer ? 'si' : 'no', rows: answer ? block.value.value.rows : [] });
const addColumn = (): void => {
    const columns = block.value.props.columns;
    if (columns.length >= MAX_BLOCK_COLUMNS) return;
    setProps({ columns: [...columns, { key: uniqueKey('', 'columna', columns.map((column) => column.key)), label: `Columna ${columns.length + 1}` }] });
};
const renameColumn = (index: number, label: string): void =>
    setProps({ columns: block.value.props.columns.map((column: BlockColumn, position: number) => position === index ? { ...column, label } : column) });
const removeColumn = (index: number): void => {
    const removed = block.value.props.columns[index];
    setProps({ columns: block.value.props.columns.filter((_: BlockColumn, position: number) => position !== index) });
    if (removed) setValue({ rows: block.value.value.rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== removed.key))) });
};
const addRow = (): void => setValue({ rows: [...block.value.value.rows, Object.fromEntries(block.value.props.columns.map((column) => [column.key, '']))] });
const removeRow = (index: number): void => setValue({ rows: block.value.value.rows.filter((_, position) => position !== index) });
const setCell = (index: number, key: string, text: string): void =>
    setValue({ rows: block.value.value.rows.map((row, position) => position === index ? { ...row, [key]: text } : row) });
const disability = computed<Disability>(() => block.value.value.disability ?? { answer: null, type: '', description: '' });
const setDisability = (next: Disability): void => setValue({ disability: next });
const followUp = computed(() => block.value.props.columns.length > 0);
const toggleFollowUp = (): void => setProps({ columns: followUp.value ? [] : [{ key: 'columna', label: 'Columna 1' }] });
</script>

<template>
  <NodeViewWrapper v-if="kind === 'identificacion'" as="div" data-block data-kind="identificacion" contenteditable="false" :class="['document-block my-2 flex flex-col gap-1', selected ? 'outline outline-2 outline-primary' : '']">
    <DocumentIdentification :disability="disability" :interactive="filling && !configuring" @update="setDisability" />
  </NodeViewWrapper>
  <NodeViewWrapper v-else as="div" data-block :data-kind="kind" contenteditable="false" :class="['document-block my-2 flex flex-col gap-2 rounded-md border p-2', selected ? 'border-primary' : 'border-border']">
    <template v-if="configuring">
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-muted-foreground">{{ kind === 'si_no' ? 'Pregunta Sí/No' : 'Lista de filas repetibles' }}</span>
        <Button type="button" variant="ghost" size="icon-sm" class="ml-auto" aria-label="Quitar el bloque" @click="deleteNode()"><Trash2 aria-hidden="true" /></Button>
      </div>
      <Input v-if="kind === 'si_no'" :model-value="block.props.question ?? ''" maxlength="300" aria-label="Pregunta del bloque" placeholder="Pregunta" @update:model-value="setProps({ question: String($event) })" />
      <Input v-else :model-value="block.props.label ?? ''" maxlength="120" aria-label="Título de la lista" placeholder="Título de la lista (opcional)" @update:model-value="setProps({ label: String($event) })" />
      <div v-if="kind === 'si_no'" class="flex items-center gap-2 text-sm">
        <Checkbox :id="followUpId" :model-value="followUp" @update:model-value="toggleFollowUp" />
        <label :for="followUpId">Si responde Sí, completa una tabla</label>
      </div>
      <div v-if="followUp || kind === 'repetible'" class="flex flex-col gap-1">
        <span class="text-xs font-medium text-muted-foreground">Columnas</span>
        <div v-for="(column, index) in block.props.columns" :key="column.key" class="flex items-center gap-1">
          <Input :model-value="column.label" maxlength="120" :aria-label="`Nombre de la columna ${index + 1}`" @update:model-value="renameColumn(index, String($event))" />
          <Button type="button" variant="ghost" size="icon-sm" :disabled="kind === 'repetible' && block.props.columns.length === 1" :aria-label="`Quitar la columna ${column.label}`" @click="removeColumn(index)"><X aria-hidden="true" /></Button>
        </div>
        <Button type="button" variant="outline" size="sm" class="w-fit" :disabled="block.props.columns.length >= MAX_BLOCK_COLUMNS" @click="addColumn"><Plus data-icon="inline-start" aria-hidden="true" />Agregar columna</Button>
      </div>
    </template>
    <template v-else>
      <p v-if="kind === 'repetible' && block.props.label" class="font-bold">{{ block.props.label }}</p>
      <p v-if="kind === 'si_no'" class="font-bold">{{ block.props.question }}</p>
      <BooleanChoice v-if="kind === 'si_no'" :label="block.props.question ?? ''" :model-value="block.value.answer === 'si' ? true : block.value.answer === 'no' ? false : null" :disabled="!filling" @update:model-value="setAnswer" />
    </template>

    <div v-if="withRows && !configuring" class="flex flex-col gap-1">
      <table class="free-text-table w-full">
        <thead>
          <tr><th v-for="column in block.props.columns" :key="column.key">{{ column.label }}</th><th v-if="filling" class="w-10"><span class="sr-only">Acciones</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in block.value.rows" :key="index">
            <td v-for="column in block.props.columns" :key="column.key">
              <Input v-if="filling" :model-value="row[column.key] ?? ''" maxlength="1000" :aria-label="`${column.label}, fila ${index + 1}`" @update:model-value="setCell(index, column.key, String($event))" />
              <span v-else>{{ row[column.key] }}</span>
            </td>
            <td v-if="filling"><Button type="button" variant="ghost" size="icon-sm" :aria-label="`Quitar la fila ${index + 1}`" @click="removeRow(index)"><Trash2 aria-hidden="true" /></Button></td>
          </tr>
        </tbody>
      </table>
      <Button v-if="filling" type="button" variant="outline" size="sm" class="w-fit" @click="addRow"><Plus data-icon="inline-start" aria-hidden="true" />Agregar fila</Button>
    </div>
  </NodeViewWrapper>
</template>
