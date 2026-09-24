<script setup lang="ts">
import { AlertCircle, Check, CheckCircle2, X } from '@lucide/vue';
import { computed } from 'vue';
import { formatSum, summarizePlanning } from '@/lib/tableLayout';
import type {
    PlanningExpectations,
    TableLayout,
    TableRowData,
} from '@/lib/tableLayout';

const props = defineProps<{
    layout: TableLayout;
    rows: TableRowData[];
    expectations?: PlanningExpectations | null;
}>();

const summary = computed(() => summarizePlanning(props.layout, props.rows));
const comparisons = computed(() => {
    if (!summary.value || !props.expectations) {
        return [];
    }

    return [
        ['ACD', summary.value.totals.hours_acd, props.expectations.hours_acd],
        ['APE', summary.value.totals.hours_ape, props.expectations.hours_ape],
        ['AA', summary.value.totals.hours_aa, props.expectations.hours_aa],
    ].map(([label, actual, expected]) => ({
        label: String(label),
        actual: Number(actual),
        expected:
            expected === null || expected === '' ? null : Number(expected),
    }));
});
const weeksOk = computed(() => {
    const expected = props.expectations?.teaching_weeks;
    const weeks = summary.value?.weeks ?? [];

    return (
        expected != null &&
        new Set(weeks).size === expected &&
        weeks.every((week, index) => week === index + 1)
    );
});
const hoursOk = computed(
    () =>
        comparisons.value.length > 0 &&
        comparisons.value.every(
            ({ actual, expected }) => expected !== null && actual === expected,
        ),
);
const configuration = computed(() => {
    const expectations = props.expectations;

    if (!expectations) {
        return {
            ok: false,
            componentsOk: false,
            creditsOk: false,
            componentTotal: null,
            total: null,
            creditHours: null,
        };
    }

    const components = [
        expectations.hours_acd,
        expectations.hours_ape,
        expectations.hours_aa,
    ];

    if (
        components.some((value) => value === null || value === '') ||
        expectations.total_hours === null ||
        expectations.total_hours === '' ||
        expectations.credits === null ||
        expectations.credits === ''
    ) {
        return {
            ok: false,
            componentsOk: false,
            creditsOk: false,
            componentTotal: null,
            total: null,
            creditHours: null,
        };
    }

    const componentTotal = components
        .map(Number)
        .reduce((sum, value) => sum + value, 0);
    const total = Number(expectations.total_hours);
    const creditHours = Number(expectations.credits) * 48;

    return {
        ok: componentTotal === total && total === creditHours,
        componentsOk: componentTotal === total,
        creditsOk: total === creditHours,
        componentTotal,
        total,
        creditHours,
    };
});
const valid = computed(
    () => weeksOk.value && hoursOk.value && configuration.value.ok,
);
const dash = (value: number | null): string =>
    value === null ? '—' : formatSum(value);
const checks = computed(() => [
    {
        label: 'Semanas',
        ok: weeksOk.value,
        value: `${new Set(summary.value?.weeks ?? []).size} de ${props.expectations?.teaching_weeks ?? '—'}`,
    },
    ...comparisons.value.map((item) => ({
        label: `Horas ${item.label}`,
        ok: item.expected !== null && item.actual === item.expected,
        value: `${formatSum(item.actual)} de ${dash(item.expected)} h`,
    })),
    {
        label: 'Componentes de la malla',
        ok: configuration.value.componentsOk,
        value: `${dash(configuration.value.componentTotal)} de ${dash(configuration.value.total)} h`,
    },
    {
        label: `Créditos (${props.expectations?.credits == null || props.expectations.credits === '' ? '—' : formatSum(Number(props.expectations.credits))} × 48)`,
        ok: configuration.value.creditsOk,
        value: `${dash(configuration.value.total)} de ${dash(configuration.value.creditHours)} h`,
    },
]);
</script>

<template>
    <section
        v-if="summary && expectations"
        class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
        aria-label="Resumen automático de planificación"
    >
        <div class="flex items-center gap-2">
            <CheckCircle2
                v-if="valid"
                class="size-4 text-primary"
                aria-hidden="true"
            />
            <AlertCircle
                v-else
                class="size-4 text-muted-foreground"
                aria-hidden="true"
            />
            <h4 class="text-sm font-medium">
                Resumen automático de planificación
            </h4>
        </div>
        <ul class="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            <li
                v-for="item in checks"
                :key="item.label"
                class="flex items-center justify-between gap-3"
            >
                <span class="flex items-center gap-2">
                    <Check
                        v-if="item.ok"
                        class="size-4 text-primary"
                        aria-hidden="true"
                    />
                    <X
                        v-else
                        class="size-4 text-destructive"
                        aria-hidden="true"
                    />
                    <span>{{ item.label }}</span>
                    <span class="sr-only">{{
                        item.ok ? 'correcto' : 'pendiente'
                    }}</span>
                </span>
                <span class="text-muted-foreground tabular-nums">{{
                    item.value
                }}</span>
            </li>
        </ul>
        <p v-if="!valid" class="text-xs text-muted-foreground">
            Puede guardar el borrador, pero antes de enviarlo deben estar todas
            las semanas y las horas deben coincidir con la malla.
        </p>
    </section>
</template>
