<script setup lang="ts">
import { HotTable } from '@handsontable/vue3';
import type Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import { registerLanguageDictionary, esMX } from 'handsontable/i18n';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import { computed, ref } from 'vue';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

registerAllModules();
registerLanguageDictionary(esMX);

type Kind = 'texto' | 'docente' | 'marca' | 'automatico';
type CellSetup = { kind: Kind; label?: string; choice?: 'Sí' | 'No'; showWhen?: 'Sí' | 'No' | null; fill?: string };

const QUESTION = 'Estudiantes con discapacidad';
const MEDIUM_BLUE = 'var(--document-table-header-strong-background)';
const AUTOMATIC = ['Nombre de la asignatura', 'Código de la asignatura', 'Nombre del período académico'];

const hot = ref<InstanceType<typeof HotTable> | null>(null);
const version = ref(0);
const setup = new Map<string, CellSetup>([
    ['0,0', { kind: 'texto', fill: MEDIUM_BLUE }],
    ['0,4', { kind: 'docente', label: 'Tipo de discapacidad', showWhen: 'Sí' }],
    ['1,4', { kind: 'docente', label: 'Descripción de la adaptación curricular', showWhen: 'Sí' }],
    ['0,2', { kind: 'marca', choice: 'Sí' }],
    ['2,2', { kind: 'marca', choice: 'No' }],
]);
const at = (row: number, col: number): CellSetup => setup.get(`${row},${col}`) ?? { kind: 'texto' };

const data = [
    ['ESTUDIANTES CON DISCAPACIDAD', 'Sí', '', 'Tipo de discapacidad:', ''],
    ['', '', '', 'Descripción de la adaptación curricular:', ''],
    ['', 'No', '', '', ''],
];

const chip = (td: HTMLTableCellElement, text: string, tone: string): void => {
    td.replaceChildren();
    const span = document.createElement('span');
    span.textContent = text;
    span.className = `prototype-chip ${tone}`;
    td.appendChild(span);
};

const renderCell: Handsontable.renderers.BaseRenderer = function (instance, td, row, col, prop, value, cellProperties) {
    const cell = at(row, col);
    td.style.background = cell.fill ?? '';
    td.style.color = cell.fill ? 'var(--document-paper)' : '';
    td.style.fontWeight = col === 0 ? '700' : '';
    td.style.verticalAlign = 'middle';
    if (cell.kind === 'docente') {
        chip(td, cell.showWhen ? `Docente · solo si responde ${cell.showWhen}` : 'Docente', 'teacher');
        td.title = cell.label ?? '';
        return;
    }
    if (cell.kind === 'marca') {
        chip(td, `X si responde ${cell.choice}`, 'mark');
        td.title = QUESTION;
        return;
    }
    if (cell.kind === 'automatico') {
        chip(td, cell.label ?? 'Dato automático', 'automatic');
        return;
    }
    td.textContent = value == null ? '' : String(value);
    void instance; void prop; void cellProperties;
};

const selected = (instance: Handsontable): Array<[number, number]> => {
    const range = instance.getSelectedRangeLast();
    if (!range) return [];
    const cells: Array<[number, number]> = [];
    const top = range.getTopStartCorner();
    const bottom = range.getBottomEndCorner();
    for (let row = top.row ?? 0; row <= (bottom.row ?? -1); row++) {
        for (let col = top.col ?? 0; col <= (bottom.col ?? -1); col++) cells.push([row, col]);
    }

    return cells;
};

const apply = (instance: Handsontable, change: (cell: CellSetup, row: number, col: number) => CellSetup): void => {
    for (const [row, col] of selected(instance)) {
        setup.set(`${row},${col}`, change(at(row, col), row, col));
    }
    instance.render();
    version.value++;
};

const labelFor = (instance: Handsontable, row: number, col: number): string => {
    for (let index = col - 1; index >= 0; index--) {
        const text = String(instance.getDataAtCell(row, index) ?? '').replace(/:$/, '').trim();
        if (text) return text;
    }

    return 'Pregunta al docente';
};

const settings = computed<Handsontable.GridSettings>(() => ({
    data,
    licenseKey: 'non-commercial-and-evaluation',
    themeName: 'ht-theme-main',
    language: esMX.languageCode,
    colWidths: [190, 50, 150, 280, 260],
    rowHeights: 40,
    height: 'auto',
    stretchH: 'all',
    mergeCells: [
        { row: 0, col: 0, rowspan: 3, colspan: 1 },
        { row: 0, col: 1, rowspan: 2, colspan: 1 },
        { row: 0, col: 2, rowspan: 2, colspan: 1 },
        { row: 2, col: 3, rowspan: 1, colspan: 2 },
    ],
    renderer: renderCell,
    cells: (row, col) => ({ readOnly: at(row, col).kind !== 'texto' }),
    contextMenu: {
        items: {
            texto: { name: 'Texto fijo', callback(this: Handsontable) { apply(this, () => ({ kind: 'texto' })); } },
            docente: {
                name: 'Lo llena el docente',
                callback(this: Handsontable) {
                    apply(this, (_cell, row, col) => ({ kind: 'docente', label: labelFor(this, row, col), showWhen: null }));
                },
            },
            automatico: {
                name: 'Dato automático',
                submenu: {
                    items: AUTOMATIC.map((label, index) => ({
                        key: `automatico:${index}`,
                        name: label,
                        callback(this: Handsontable) { apply(this, () => ({ kind: 'automatico', label })); },
                    })),
                },
            },
            marca: {
                name: `Marca X de «${QUESTION}»`,
                submenu: {
                    items: (['Sí', 'No'] as const).map((choice) => ({
                        key: `marca:${choice}`,
                        name: `Cuando responde ${choice}`,
                        callback(this: Handsontable) { apply(this, () => ({ kind: 'marca', choice })); },
                    })),
                },
            },
            condicion: {
                name: 'Cuándo se pide',
                disabled(this: Handsontable) { return !selected(this).some(([row, col]) => at(row, col).kind === 'docente'); },
                submenu: {
                    items: [
                        { key: 'condicion:siempre', name: 'Siempre', callback(this: Handsontable) { apply(this, (cell) => ({ ...cell, showWhen: null })); } },
                        { key: 'condicion:si', name: `Solo si «${QUESTION}» es Sí`, callback(this: Handsontable) { apply(this, (cell) => ({ ...cell, showWhen: 'Sí' })); } },
                        { key: 'condicion:no', name: `Solo si «${QUESTION}» es No`, callback(this: Handsontable) { apply(this, (cell) => ({ ...cell, showWhen: 'No' })); } },
                    ],
                },
            },
            sep1: '---------',
            fondo: {
                name: 'Color de celda',
                submenu: {
                    items: [
                        { key: 'fondo:ninguno', name: 'Sin fondo', callback(this: Handsontable) { apply(this, (cell) => ({ ...cell, fill: undefined })); } },
                        { key: 'fondo:oscuro', name: 'Azul medio', callback(this: Handsontable) { apply(this, (cell) => ({ ...cell, fill: MEDIUM_BLUE })); } },
                    ],
                },
            },
            mergeCells: {},
            sep2: '---------',
            row_above: {},
            row_below: {},
            col_left: {},
            col_right: {},
            remove_row: {},
            remove_col: {},
        },
    },
}));

const answer = ref<'Sí' | 'No'>('Sí');
const teacherQuestions = computed(() => {
    void version.value;

    return [...setup.values()].filter((cell) => cell.kind === 'docente');
});
</script>

<template>
    <main class="mx-auto flex max-w-6xl flex-col gap-6 p-8">
        <header class="flex flex-col gap-1">
            <h1 class="text-xl font-semibold">Prueba: tabla con Handsontable</h1>
            <p class="text-sm text-muted-foreground">
                Clic derecho sobre una celda para elegir qué es: texto fijo, lo llena el docente, dato automático o la marca X. Para que una pregunta del docente dependa del Sí/No, clic derecho sobre ella → «Cuándo se pide».
            </p>
        </header>

        <HotTable ref="hot" :settings="settings" />

        <section class="flex flex-col gap-3 rounded-lg border p-4">
            <h2 class="font-medium">Así lo vería el docente</h2>
            <label class="flex items-center gap-3 text-sm">
                {{ QUESTION }}
                <Select v-model="answer">
                    <SelectTrigger class="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Sí">Sí</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                </Select>
            </label>
            <ul class="list-disc pl-6 text-sm">
                <li v-for="(question, index) in teacherQuestions.filter((item) => !item.showWhen || item.showWhen === answer)" :key="index">{{ question.label }}</li>
            </ul>
        </section>
    </main>
</template>

<style>
.prototype-chip {
    display: inline-block;
    border: 1px dashed currentColor;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 12px;
}
.prototype-chip.teacher { color: var(--document-accent); }
.prototype-chip.mark { color: var(--document-accent); font-weight: 600; }
.prototype-chip.automatic { color: var(--document-muted-text); }
</style>
