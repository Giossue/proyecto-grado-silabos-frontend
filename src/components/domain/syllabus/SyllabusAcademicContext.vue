<script setup lang="ts">
import { computed } from 'vue';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Identificación institucional en la pantalla del docente: los datos que llegan de
 * la planificación académica, como lista de solo lectura. El Word/PDF conserva su
 * propia tabla; esto no la imita.
 */
const props = defineProps<{
    variables: Record<string, string>;
}>();

type ContextGroup = {
    title: string;
    items: { label: string; value: string }[];
};

const PENDING = 'Pendiente de Coordinación';

/** «64.00» se muestra como «64»; «2.50», como «2.5». */
const number = (raw: string): string =>
    /^\d+\.\d+$/.test(raw) ? raw.replace(/\.?0+$/, '') : raw;

const value = (key: string): string =>
    number(props.variables[key]?.trim() ?? '') || PENDING;

const UNIT_MARKS: [string, string][] = [
    ['marca_unidad_basica', 'Unidad básica'],
    ['marca_unidad_profesional', 'Unidad profesional'],
    ['marca_unidad_titulacion', 'Unidad de integración curricular'],
];

const curricularUnit = computed(
    () =>
        props.variables.unidad_organizacion_curricular?.trim() ||
        UNIT_MARKS.find(([key]) => props.variables[key]?.trim())?.[1] ||
        PENDING,
);

const groups = computed<ContextGroup[]>(() => [
    {
        title: 'Asignatura',
        items: [
            { label: 'Nombre', value: value('nombre_asignatura') },
            { label: 'Código', value: value('codigo_asignatura') },
            { label: 'Carrera', value: value('nombre_carrera') },
            { label: 'Facultad', value: value('nombre_facultad') },
            { label: 'Unidad de organización curricular', value: curricularUnit.value },
            { label: 'Prerrequisitos', value: value('prerrequisitos_asignatura') },
            { label: 'Correquisitos', value: value('correquisitos_asignatura') },
        ],
    },
    {
        title: 'Oferta académica',
        items: [
            { label: 'Período académico', value: value('nombre_periodo_academico') },
            { label: 'Campus', value: value('nombre_campus') },
            { label: 'Modalidad', value: value('modalidad_estudio') },
            { label: 'Ciclo', value: value('ciclo_asignatura') },
            { label: 'Paralelo', value: value('codigo_paralelo') },
            { label: 'Jornada', value: value('jornada_paralelo') },
        ],
    },
    {
        title: 'Carga académica',
        items: [
            { label: 'Horas ACD', value: value('horas_docencia') },
            { label: 'Horas APE', value: value('horas_practicas') },
            { label: 'Horas AA', value: value('horas_autonomas') },
            { label: 'Total de horas', value: value('horas_totales') },
            { label: 'Créditos', value: value('creditos_asignatura') },
        ],
    },
    {
        title: 'Docente',
        items: [
            { label: 'Nombre', value: value('nombre_docente') },
            { label: 'Correo', value: value('correo_docente') },
        ],
    },
]);
</script>

<template>
    <Card>
        <CardContent class="grid gap-6 md:grid-cols-2 2xl:grid-cols-4">
            <section
                v-for="group in groups"
                :key="group.title"
                class="flex min-w-0 flex-col gap-3"
            >
                <h3 class="text-sm font-medium">{{ group.title }}</h3>
                <dl class="flex flex-col gap-3">
                    <div
                        v-for="item in group.items"
                        :key="item.label"
                        class="min-w-0"
                    >
                        <dt class="text-xs text-muted-foreground">
                            {{ item.label }}
                        </dt>
                        <dd class="text-sm font-medium break-words">
                            {{ item.value }}
                        </dd>
                    </div>
                </dl>
            </section>
        </CardContent>
    </Card>
</template>
