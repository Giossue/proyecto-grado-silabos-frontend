<script setup lang="ts">
import { Info, Link2, Trash2 } from '@lucide/vue';
import { Controls } from '@vue-flow/controls';
import {
    ConnectionMode,
    MarkerType,
    useVueFlow,
    VueFlow,
} from '@vue-flow/core';
import type {
    Connection,
    CoordinateExtent,
    Edge,
    EdgeMouseEvent,
    Node,
    NodeDragEvent,
    NodeMouseEvent,
} from '@vue-flow/core';
import { MiniMap } from '@vue-flow/minimap';
import { computed, ref, watch } from 'vue';
import { ApiError } from '@/api/client';
import {
    createSubjectRequirement,
    deleteSubjectRequirement,
    updateSubjectLayout,
} from '@/api/career-academics';
import CurriculumAddSubjectNode from '@/components/domain/academic/curriculum/CurriculumAddSubjectNode.vue';
import CurriculumCycleNode from '@/components/domain/academic/curriculum/CurriculumCycleNode.vue';
import CurriculumLegend from '@/components/domain/academic/curriculum/CurriculumLegend.vue';
import CurriculumLegendPanel from '@/components/domain/academic/curriculum/CurriculumLegendPanel.vue';
import CurriculumRequirementEdge from '@/components/domain/academic/curriculum/CurriculumRequirementEdge.vue';
import CurriculumSubjectNode from '@/components/domain/academic/curriculum/CurriculumSubjectNode.vue';
import CurriculumVisualSubjectForm from '@/components/domain/academic/curriculum/CurriculumVisualSubjectForm.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';
import { formatNumericDisplay } from '@/lib/numberDisplay';
import { toast } from '@/lib/toast';
import type {
    CurriculumBuilderProps,
    CurriculumBuilderSubject,
} from '@/types/academic';

import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';

const props = defineProps<
    Pick<
        CurriculumBuilderProps,
        | 'curriculum'
        | 'fixedFields'
        | 'fixedFieldTotals'
        | 'subjects'
        | 'requirements'
        | 'career'
    > & {
        organizationUnits: string[];
        modalityOptions: CurriculumBuilderProps['modalityOptions'];
    }
>();
const emit = defineEmits<{ changed: [message: string] }>();

// Paleta al estilo de la malla institucional: cada unidad de organización
// curricular recibe un color que comparten su franja de nivel y los encabezados
// ACD/APE/… de sus tarjetas. El orden sigue al listado alfabético de unidades.
const UNIT_PALETTE = [
    { backgroundColor: 'var(--curriculum-unit-1-background)', color: 'var(--curriculum-unit-1-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-2-background)', color: 'var(--curriculum-unit-2-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-3-background)', color: 'var(--curriculum-unit-3-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-4-background)', color: 'var(--curriculum-unit-4-foreground)' },
    { backgroundColor: 'var(--curriculum-unit-5-background)', color: 'var(--curriculum-unit-5-foreground)' },
];
const FALLBACK_UNIT_STYLE = {
    backgroundColor: 'var(--primary)',
    color: 'var(--primary-foreground)',
};

const unitStyleFor = (
    unit: string | null | undefined,
): (typeof UNIT_PALETTE)[number] => {
    const index = props.organizationUnits.indexOf(unit?.trim() ?? '');

    return index === -1
        ? FALLBACK_UNIT_STYLE
        : UNIT_PALETTE[index % UNIT_PALETTE.length];
};

const ROMAN_NUMERALS = [
    ['X', 10],
    ['IX', 9],
    ['V', 5],
    ['IV', 4],
    ['I', 1],
] as const;

const toRoman = (value: number): string => {
    let remaining = value;
    let roman = '';
    ROMAN_NUMERALS.forEach(([symbol, amount]) => {
        while (remaining >= amount) {
            roman += symbol;
            remaining -= amount;
        }
    });

    return roman || String(value);
};

// La unidad predominante del ciclo define el color de su franja lateral.
const dominantUnit = (
    cycleSubjects: CurriculumBuilderSubject[],
): string | null => {
    const counts = new Map<string, number>();
    cycleSubjects.forEach((subject) => {
        const unit = subject.organization_unit?.trim();

        if (unit) {
            counts.set(unit, (counts.get(unit) ?? 0) + 1);
        }
    });

    return [...counts.entries()].reduce<[string | null, number]>(
        (winner, [unit, count]) => (count > winner[1] ? [unit, count] : winner),
        [null, 0],
    )[0];
};

const summaryLabel = (fieldId: string, label: string): string =>
    props.fixedFields.find((field) => field.id === fieldId)?.system_label ??
    label;

// La leyenda y el resumen se arman una sola vez y se reparten entre el panel de
// escritorio y el desplegable de móvil.
const legendUnits = computed(() =>
    props.organizationUnits.map((unit) => ({
        unit,
        style: unitStyleFor(unit),
    })),
);
const summaryRows = computed(() => [
    {
        id: 'modality',
        label: 'Modalidad',
        value: props.career.modality?.label ?? '—',
    },
    {
        id: 'subjects',
        label: 'N° asignaturas',
        value: String(props.subjects.length),
    },
    ...props.fixedFieldTotals.map((total) => ({
        id: total.id,
        label: summaryLabel(total.id, total.label),
        value: formatNumericDisplay(total.value),
    })),
]);

const flowId = `curriculum-${props.curriculum.id}`;
const { setEdges, setNodes } = useVueFlow({ id: flowId });

// El carril se dibuja un 30 % más bajo que los 340 px originales; con menos aire
// sobrante, las tarjetas se centran en él en vez de colgar del borde superior.
const laneHeight = 238;
const laneInset = 16;
// La tarjeta incluye la fila de modalidad sobre las horas.
const subjectHeight = computed(() => 158);
const addSubjectHeight = 36;
const subjectOffset = computed(() =>
    Math.round((laneHeight - laneInset - subjectHeight.value) / 2),
);
const addSubjectOffset = Math.round(
    (laneHeight - laneInset - addSubjectHeight) / 2,
);
const laneStart = 145;
// Tarjeta de 274 px (un 7 % más ancha que las 256 originales) más 34 px de aire.
const subjectStep = 308;
const editingSubjectId = ref<string | null>(null);
const draftCycle = ref<number | null>(null);
const dragPreview = ref<{ subjectId: string; cycle: number; index: number } | null>(null);
const savingLayout = ref(false);
const hasOpenEditor = computed(
    () => editingSubjectId.value !== null || draftCycle.value !== null,
);
const editable = computed(
    () => props.curriculum.editable && !props.curriculum.lock_reason,
);

const subjectsForCycle = (cycle: number): CurriculumBuilderSubject[] =>
    props.subjects
        .filter((subject) => subject.cycle === cycle)
        .sort((left, right) =>
            left.position === right.position
                ? left.name.localeCompare(right.name)
                : left.position - right.position,
        );

const previewSubjectsForCycle = (cycle: number): CurriculumBuilderSubject[] => {
    const subjects = subjectsForCycle(cycle);
    const preview = dragPreview.value;
    if (!preview || preview.cycle !== cycle) return subjects;
    const sourceIndex = subjects.findIndex((subject) => subject.id === preview.subjectId);
    if (sourceIndex === -1) return subjects;
    const [moved] = subjects.splice(sourceIndex, 1);
    if (moved) subjects.splice(preview.index, 0, moved);
    return subjects;
};

const laneWidth = computed(() => {
    const widestCycle = Array.from(
        { length: props.curriculum.cycle_count },
        (_, index) => {
            const cycle = index + 1;
            return laneStart +
                subjectsForCycle(cycle).length * subjectStep +
                (editable.value ? subjectStep : 0);
        },
    ).reduce((widest, width) => Math.max(widest, width), 0);

    // Los 200px extra reservan espacio para las columnas de totales del nivel.
    return Math.max(1120, widestCycle + 200);
});

// El viewport termina donde termina la malla. El margen permite respirar alrededor
// del primer y último ciclo sin dejar que el lienzo navegue hacia espacio infinito.
const navigationPadding = 48;
const navigationExtent = computed<CoordinateExtent>(() => {
    const contentHeight = Math.max(
        laneHeight - laneInset,
        props.curriculum.cycle_count * laneHeight - laneInset,
    );

    return [
        [-navigationPadding, -navigationPadding],
        [
            laneWidth.value + navigationPadding,
            contentHeight + navigationPadding,
        ],
    ];
});

const subjectById = computed(
    () => new Map(props.subjects.map((subject) => [subject.id, subject])),
);
const editorSubject = computed(() =>
    editingSubjectId.value ? subjectById.value.get(editingSubjectId.value) ?? null : null,
);
const editorCycle = computed(() => editorSubject.value?.cycle ?? draftCycle.value ?? 1);
const editorPosition = computed(() =>
    editorSubject.value?.position ??
    Math.max(-1, ...subjectsForCycle(editorCycle.value).map((subject) => subject.position)) + 1,
);

const beginSubjectEdit = (subjectId: string): void => {
    if (!editable.value) return;
    draftCycle.value = null;
    editingSubjectId.value = subjectId;
};

const beginSubjectCreation = (cycle: number): void => {
    if (!editable.value) return;
    editingSubjectId.value = null;
    draftCycle.value = cycle;
};

const closeEditor = (): void => {
    editingSubjectId.value = null;
    draftCycle.value = null;
};

const buildNodes = (): Node[] => {
    const nodes: Node[] = [];

    for (let cycle = 1; cycle <= props.curriculum.cycle_count; cycle += 1) {
        const cycleSubjects = previewSubjectsForCycle(cycle);
        nodes.push({
            id: `cycle-${cycle}`,
            type: 'cycle',
            position: { x: 0, y: (cycle - 1) * laneHeight },
            data: {
                cycle,
                level: toRoman(cycle),
                unit: dominantUnit(cycleSubjects),
                unitStyle: unitStyleFor(dominantUnit(cycleSubjects)),
                subjectCount: cycleSubjects.length,
                totalHours: cycleSubjects.reduce(
                    (total, subject) => total + (subject.total_hours ?? 0),
                    0,
                ),
            },
            draggable: false,
            selectable: false,
            connectable: false,
            focusable: false,
            style: {
                width: `${laneWidth.value}px`,
                height: `${laneHeight - laneInset}px`,
            },
            zIndex: -1,
        });

        let x = laneStart;
        cycleSubjects.forEach((subject) => {
            const cycleY = (cycle - 1) * laneHeight + subjectOffset.value;
            nodes.push({
                id: subject.id,
                type: 'subject',
                position: {
                    x,
                    y: cycleY,
                },
                data: {
                    career: props.career,
                    curriculum: props.curriculum,
                    fixedFields: props.fixedFields,
                    subject,
                    unitStyle: unitStyleFor(subject.organization_unit),
                    editable: editable.value,
                    onEdit: () => beginSubjectEdit(subject.id),
                    onSaved: (message?: string) => {
                        if (message) emit('changed', message);
                    },
                },
                draggable: editable.value && !hasOpenEditor.value && !savingLayout.value,
                // Vue Flow descuenta las dimensiones medidas del nodo del límite
                // superior. Darle solo la coordenada final de la tarjeta la empuja
                // fuera del carril al empezar a arrastrarla.
                extent: [
                    [laneStart, cycleY],
                    [laneStart + cycleSubjects.length * subjectStep, cycleY + laneHeight - laneInset],
                ],
                connectable: editable.value && !hasOpenEditor.value,
                selectable: false,
                zIndex: dragPreview.value?.subjectId === subject.id ? 10 : 0,
            });
            x += subjectStep;
        });

        if (!editable.value) {
            continue;
        }

        nodes.push({
            id: `add-subject-${cycle}`,
            type: 'addSubject',
            position: {
                x,
                y: (cycle - 1) * laneHeight + addSubjectOffset,
            },
            data: {
                cycle,
                disabled: hasOpenEditor.value || savingLayout.value,
            },
            draggable: false,
            selectable: false,
            connectable: false,
        });
    }

    return nodes;
};

// Reparte las conexiones que comparten conector. La primera se queda en el centro de
// la materia —que es de donde se espera que salga una línea— y las siguientes se
// apartan hacia un lado para no pisarla.
const EDGE_SPACING = 18;

type Requirement = (typeof props.requirements)[number];

/*
 * Reparto de las líneas en cada conector. Por abajo salen prerrequisitos y
 * correquisitos hacia otros niveles; por arriba llegan todas las líneas y, además,
 * apoyan sus dos extremos los correquisitos del mismo nivel (van por encima). Todo lo
 * que toca el borde superior de una tarjeta se reparte en un mismo grupo: si el extremo
 * de salida de un correquisito se repartiera aparte, caería sobre una llegada.
 */
const edgeOffsets = (
    sameLevelIds: Set<string>,
): Map<string, { source: number; target: number; topShared: boolean }> => {
    const orderKey = (subjectId: string): number => {
        const subject = subjectById.value.get(subjectId);

        return subject ? (subject.cycle ?? 0) * 1000 + subject.position : 0;
    };
    type End = { requirement: Requirement; end: 'source' | 'target' };
    const bottom = new Map<string, End[]>();
    const top = new Map<string, End[]>();
    const push = (map: Map<string, End[]>, key: string, end: End): void => {
        map.set(key, [...(map.get(key) ?? []), end]);
    };
    props.requirements.forEach((requirement) => {
        push(top, requirement.subject_id, { requirement, end: 'target' });

        if (sameLevelIds.has(requirement.id)) {
            push(top, requirement.requirement_id, {
                requirement,
                end: 'source',
            });
        } else {
            push(bottom, requirement.requirement_id, {
                requirement,
                end: 'source',
            });
        }
    });
    const counterpart = (end: End): string =>
        end.end === 'target'
            ? end.requirement.requirement_id
            : end.requirement.subject_id;
    const result = new Map<
        string,
        { source: number; target: number; topShared: boolean }
    >();
    const entry = (id: string) => {
        const current = result.get(id) ?? {
            source: 0,
            target: 0,
            topShared: false,
        };
        result.set(id, current);

        return current;
    };
    [bottom, top].forEach((map, index) => {
        map.forEach((ends) => {
            const sorted = [...ends].sort(
                (left, right) =>
                    orderKey(counterpart(left)) - orderKey(counterpart(right)),
            );
            sorted.forEach((end, slot) => {
                const current = entry(end.requirement.id);
                current[end.end] = slot * EDGE_SPACING;

                if (index === 1 && sorted.length > 1) {
                    current.topShared = true;
                }
            });
        });
    });

    return result;
};

const buildEdges = (): Edge[] => {
    const cycleOf = new Map(
        props.subjects.map((subject) => [subject.id, subject.cycle]),
    );
    // Un correquisito del mismo nivel se dibuja por encima de las tarjetas, como en la
    // malla oficial, con punta en los dos extremos; por debajo cruzaba las horas.
    const sameLevelIds = new Set(
        props.requirements
            .filter(
                (requirement) =>
                    requirement.type === 'correquisito' &&
                    cycleOf.get(requirement.requirement_id) ===
                        cycleOf.get(requirement.subject_id),
            )
            .map((requirement) => requirement.id),
    );
    const offsets = edgeOffsets(sameLevelIds);

    return props.requirements.map((requirement) => {
        const color =
            requirement.type === 'correquisito'
                ? 'var(--primary)'
                : 'var(--destructive)';
        const sameLevel = sameLevelIds.has(requirement.id);
        const offset = offsets.get(requirement.id);

        return {
            id: requirement.id,
            source: requirement.requirement_id,
            target: requirement.subject_id,
            type: 'requirement',
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color,
                width: 16,
                height: 16,
            },
            ...(sameLevel
                ? {
                      markerStart: {
                          type: MarkerType.ArrowClosed,
                          color,
                          width: 16,
                          height: 16,
                      },
                  }
                : {}),
            style: { stroke: color, strokeWidth: 2 },
            data: {
                label:
                    requirement.type === 'correquisito'
                        ? 'Correquisito'
                        : 'Prerrequisito',
                sourceOffset: offset?.source ?? 0,
                targetOffset: offset?.target ?? 0,
                sameLevel,
                // Con varias líneas en el borde superior, cada una conserva su reparto:
                // si una se recentrara, caería sobre la vecina.
                targetShared: offset?.topShared ?? false,
            },
        };
    });
};

const nodes = ref<Node[]>(buildNodes());
const edges = ref<Edge[]>(buildEdges());

watch(() => props.subjects, () => { dragPreview.value = null; });

watch(
    [
        () => props.subjects,
        () => props.requirements,
        () => props.organizationUnits,
        () => props.curriculum.cycle_count,
        editingSubjectId,
        draftCycle,
    ],
    () => {
        const nextNodes = buildNodes();
        const nextEdges = buildEdges();

        nodes.value = nextNodes;
        edges.value = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
    },
    { deep: true },
);

const onNodeClick = ({ node }: NodeMouseEvent): void => {
    const cycle = node.data.cycle;

    if (
        node.type === 'addSubject' &&
        node.data.disabled !== true &&
        typeof cycle === 'number'
    ) {
        beginSubjectCreation(cycle);
    }
};

// La conexión no se guarda de inmediato: primero se pregunta el tipo, porque un
// mismo gesto de arrastre puede ser prerrequisito o correquisito.
const pendingConnection = ref<{ sourceId: string; targetId: string } | null>(
    null,
);
const savingRequirement = ref(false);
const subjectName = (id: string | null | undefined): string =>
    (id && subjectById.value.get(id)?.name) || 'materia';

const onConnect = (connection: Connection): void => {
    if (
        !editable.value ||
        hasOpenEditor.value ||
        connection.source === null ||
        connection.target === null
    ) {
        return;
    }

    pendingConnection.value = {
        sourceId: connection.source,
        targetId: connection.target,
    };
};

const createRequirement = async (type: 'prerrequisito' | 'correquisito'): Promise<void> => {
    const pending = pendingConnection.value;

    if (!editable.value || !pending) {
        return;
    }

    savingRequirement.value = true;
    try {
        const result = await createSubjectRequirement(props.curriculum.id, {
            requirement_id: pending.sourceId,
            subject_id: pending.targetId,
            type,
        });
        toast.success(type === 'correquisito' ? 'Correquisito agregado.' : 'Prerrequisito agregado.');
        emit('changed', result.message);
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo crear la relación.');
    } finally {
        savingRequirement.value = false;
        pendingConnection.value = null;
    }
};

// Clic sobre una línea: permite revisar la relación y eliminarla si se creó mal.
const selectedRequirement = ref<(typeof props.requirements)[number] | null>(
    null,
);
const deletingRequirement = ref(false);

const onEdgeClick = ({ edge }: EdgeMouseEvent): void => {
    if (!editable.value || hasOpenEditor.value) {
        return;
    }

    selectedRequirement.value =
        props.requirements.find((requirement) => requirement.id === edge.id) ??
        null;
};

const deleteRequirement = async (): Promise<void> => {
    const requirement = selectedRequirement.value;

    if (!editable.value || !requirement) {
        return;
    }

    deletingRequirement.value = true;
    try {
        const result = await deleteSubjectRequirement(props.curriculum.id, requirement.id);
        toast.success('Relación académica eliminada.');
        emit('changed', result.message);
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo eliminar la relación.');
    } finally {
        deletingRequirement.value = false;
        selectedRequirement.value = null;
    }
};

const onNodeDrag = ({ node }: NodeDragEvent): void => {
    const subject = subjectById.value.get(node.id);
    if (!editable.value || savingLayout.value || node.type !== 'subject' || !subject || typeof subject.cycle !== 'number') return;

    const cycleSubjects = subjectsForCycle(subject.cycle);
    const cycleY = (subject.cycle - 1) * laneHeight + subjectOffset.value;
    const maxX = laneStart + (cycleSubjects.length - 1) * subjectStep;
    const x = Math.max(laneStart, Math.min(maxX, node.position.x));
    const index = Math.max(0, Math.min(cycleSubjects.length - 1,
        Math.round((x - laneStart) / subjectStep)));

    if (dragPreview.value?.subjectId !== node.id || dragPreview.value.index !== index) {
        dragPreview.value = { subjectId: node.id, cycle: subject.cycle, index };
    }
    const previewPositions = new Map(previewSubjectsForCycle(subject.cycle).map((item, slot) => [item.id, slot]));
    nodes.value = nodes.value.map((current) => {
        if (current.id === node.id) return {
            ...current,
            position: { x, y: cycleY },
            zIndex: 10,
        };
        const slot = previewPositions.get(current.id);
        return slot === undefined ? current : {
            ...current,
            position: { ...current.position, x: laneStart + slot * subjectStep },
        };
    });
};

const onNodeDragStop = async (event: NodeDragEvent): Promise<void> => {
    const { node } = event;
    const subject = subjectById.value.get(node.id);
    if (!editable.value || node.type !== 'subject' || !subject || typeof subject.cycle !== 'number') return;
    onNodeDrag(event);
    const originalIndex = subjectsForCycle(subject.cycle).findIndex((item) => item.id === node.id);
    const index = dragPreview.value?.index ?? originalIndex;
    if (index === originalIndex) {
        dragPreview.value = null;
        const restoredNodes = buildNodes();
        nodes.value = restoredNodes;
        setNodes(restoredNodes);
        return;
    }

    // La vista previa se conserva hasta que la consulta refresque la malla.
    savingLayout.value = true;
    const previewNodes = buildNodes();
    nodes.value = previewNodes;
    setNodes(previewNodes);
    try {
        const result = await updateSubjectLayout(props.curriculum.id, {
            subject_id: node.id,
            cycle: subject.cycle,
            position: index,
        });
        emit('changed', result.message);
    } catch (reason) {
        dragPreview.value = null;
        const restoredNodes = buildNodes();
        nodes.value = restoredNodes;
        setNodes(restoredNodes);
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo mover la materia.');
    } finally {
        savingLayout.value = false;
    }
};
</script>

<template>
    <div
        class="relative h-[72vh] min-h-[34rem] overflow-hidden rounded-lg border bg-background shadow-surface"
        aria-label="Modo interactivo de la malla"
    >
        <!--
            Panel al estilo del pie de la malla institucional: leyenda de
            relaciones y de unidades de organización curricular, más el resumen de
            totales de la malla completa. En móvil taparía media malla, así que
            ahí se repliega tras un botón y se consulta cuando hace falta.
        -->
        <div class="absolute top-3 right-3 z-10 max-sm:hidden">
            <CurriculumLegendPanel
                :units="legendUnits"
                :rows="summaryRows"
            />
        </div>
        <Popover>
            <PopoverTrigger as-child>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="absolute top-3 right-3 z-10 bg-card sm:hidden"
                    aria-label="Ver leyenda y totales de la malla"
                >
                    <Info aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" class="w-60 p-3">
                <CurriculumLegend :units="legendUnits" :rows="summaryRows" />
            </PopoverContent>
        </Popover>
        <VueFlow
            :id="flowId"
            v-model:nodes="nodes"
            v-model:edges="edges"
            fit-view-on-init
            :min-zoom="0.2"
            :max-zoom="1.5"
            :translate-extent="navigationExtent"
            :auto-pan-on-node-drag="false"
            :connection-mode="ConnectionMode.Loose"
            :nodes-draggable="editable && !hasOpenEditor"
            :nodes-connectable="editable && !hasOpenEditor"
            :elements-selectable="true"
            @connect="onConnect"
            @edge-click="onEdgeClick"
            @node-click="onNodeClick"
            @node-drag="onNodeDrag"
            @node-drag-stop="onNodeDragStop"
        >
            <template #edge-requirement="edgeProps">
                <CurriculumRequirementEdge v-bind="edgeProps" />
            </template>
            <template #node-cycle="nodeProps">
                <CurriculumCycleNode :data="nodeProps.data" />
            </template>
            <template #node-subject="nodeProps">
                <CurriculumSubjectNode
                    :data="nodeProps.data"
                    :dragging="nodeProps.dragging"
                />
            </template>
            <template #node-addSubject="nodeProps">
                <CurriculumAddSubjectNode
                    :data="nodeProps.data"
                    @add="beginSubjectCreation"
                />
            </template>
            <Controls
                position="bottom-left"
                :show-fit-view="false"
                :show-interactive="false"
            />
            <Dialog
                :open="pendingConnection !== null"
                @update:open="
                    (isOpen) => {
                        if (!isOpen) pendingConnection = null;
                    }
                "
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva relación académica</DialogTitle>
                        <DialogDescription>
                            «{{ subjectName(pendingConnection?.sourceId) }}» →
                            «{{ subjectName(pendingConnection?.targetId) }}».
                            Prerrequisito: debe aprobarse antes. Correquisito:
                            se cursan a la vez.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose as-child>
                            <Button
                                type="button"
                                variant="outline"
                                :disabled="savingRequirement"
                            >
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="secondary"
                            :disabled="savingRequirement"
                            @click="createRequirement('correquisito')"
                        >
                            Correquisito
                        </Button>
                        <Button
                            type="button"
                            :disabled="savingRequirement"
                            @click="createRequirement('prerrequisito')"
                        >
                            <Link2
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                            Prerrequisito
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                :open="selectedRequirement !== null"
                @update:open="
                    (isOpen) => {
                        if (!isOpen) selectedRequirement = null;
                    }
                "
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {{
                                selectedRequirement?.type === 'correquisito'
                                    ? 'Correquisito'
                                    : 'Prerrequisito'
                            }}
                        </DialogTitle>
                        <DialogDescription>
                            «{{
                                subjectName(
                                    selectedRequirement?.requirement_id,
                                )
                            }}» → «{{
                                subjectName(selectedRequirement?.subject_id)
                            }}». Si la relación se creó por error, puede
                            eliminarla; las materias no se modifican.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose as-child>
                            <Button
                                type="button"
                                variant="outline"
                                :disabled="deletingRequirement"
                            >
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button
                            type="button"
                            variant="destructive"
                            :disabled="deletingRequirement"
                            @click="deleteRequirement"
                        >
                            <Spinner
                                v-if="deletingRequirement"
                                data-icon="inline-start"
                            />
                            <Trash2
                                v-else
                                data-icon="inline-start"
                                aria-hidden="true"
                            />
                            Eliminar relación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <MiniMap
                class="max-sm:hidden"
                pannable
                zoomable
                node-color="var(--muted)"
                node-stroke-color="var(--border)"
                mask-color="color-mix(in srgb, var(--background) 65%, transparent)"
            />
        </VueFlow>
        <Dialog :open="hasOpenEditor" @update:open="(open) => { if (!open) closeEditor(); }">
            <DialogContent class="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{{ editorSubject ? 'Editar materia' : 'Agregar materia' }}</DialogTitle>
                    <DialogDescription>
                        Ciclo {{ toRoman(editorCycle) }}. Complete los datos académicos de la materia.
                    </DialogDescription>
                </DialogHeader>
                <CurriculumVisualSubjectForm
                    :key="editorSubject?.id ?? `new-${editorCycle}`"
                    :career="career"
                    :modality-options="modalityOptions"
                    :curriculum="curriculum"
                    :fixed-fields="fixedFields"
                    :organization-units="organizationUnits"
                    :subject="editorSubject"
                    :cycle="editorCycle"
                    :position="editorPosition"
                    @cancel="closeEditor"
                    @saved="(message) => { closeEditor(); if (message) emit('changed', message); }"
                />
            </DialogContent>
        </Dialog>
    </div>
</template>

<style scoped>
:deep(.vue-flow) {
    background-color: color-mix(in srgb, var(--background) 90%, black);
}

:deep(.vue-flow__node-subject:not(.dragging)) {
    transition: transform 150ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
    :deep(.vue-flow__node-subject) {
        transition: none;
    }
}

:deep(.vue-flow__minimap) {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    background-color: var(--card);
}

:deep(.vue-flow__controls) {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: calc(var(--radius) - 2px);
    box-shadow: none;
}

:deep(.vue-flow__controls-button) {
    border-bottom: 1px solid var(--border);
    background-color: var(--card);
    color: var(--foreground);
}

:deep(.vue-flow__controls-button:last-child) {
    border-bottom: none;
}

:deep(.vue-flow__controls-button:hover) {
    background-color: var(--accent);
}

:deep(.vue-flow__controls-button svg) {
    fill: currentColor;
}
</style>
