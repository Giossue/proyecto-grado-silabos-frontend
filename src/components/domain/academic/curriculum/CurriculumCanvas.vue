<script setup lang="ts">
import { Info } from "@lucide/vue";
import CurriculumNavigationControls from '@/components/domain/academic/curriculum/CurriculumNavigationControls.vue';
import { ConnectionMode, useVueFlow, VueFlow } from "@vue-flow/core";
import type {
  Connection,
  CoordinateExtent,
  Edge,
  EdgeMouseEvent,
  Node,
  NodeDragEvent,
  NodeMouseEvent,
} from "@vue-flow/core";
import { computed, nextTick, ref, watch } from "vue";
import { ApiError } from "@/api/client";
import { updateSubjectLayout } from "@/api/career-academics";
import CurriculumAddSubjectNode from "@/components/domain/academic/curriculum/CurriculumAddSubjectNode.vue";
import {
  buildCurriculumNodes,
  CANVAS_ZOOM,
  buildRequirementEdges,
  FALLBACK_UNIT_STYLE,
  laneHeight,
  laneInset,
  laneStart,
  navigationPadding,
  subjectOffset,
  subjectStep,
  toRoman,
  UNIT_PALETTE,
} from "@/components/domain/academic/curriculum/curriculumCanvasLayout";
import type { CurriculumRequirement } from "@/components/domain/academic/curriculum/curriculumCanvasLayout";
import CurriculumCycleNode from "@/components/domain/academic/curriculum/CurriculumCycleNode.vue";
import CurriculumLegend from "@/components/domain/academic/curriculum/CurriculumLegend.vue";
import CurriculumLegendPanel from "@/components/domain/academic/curriculum/CurriculumLegendPanel.vue";
import CurriculumRequirementDialogs from "@/components/domain/academic/curriculum/CurriculumRequirementDialogs.vue";
import CurriculumRequirementEdge from "@/components/domain/academic/curriculum/CurriculumRequirementEdge.vue";
import CurriculumSubjectNode from "@/components/domain/academic/curriculum/CurriculumSubjectNode.vue";
import CurriculumVisualSubjectForm from "@/components/domain/academic/curriculum/CurriculumVisualSubjectForm.vue";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatNumericDisplay } from "@/lib/numberDisplay";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  CurriculumBuilderProps,
  CurriculumBuilderSubject,
} from "@/types/academic";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";

const props = defineProps<
  Pick<
    CurriculumBuilderProps,
    | "curriculum"
    | "fixedFields"
    | "fixedFieldTotals"
    | "subjects"
    | "requirements"
    | "career"
  > & {
    editing: boolean;
    fullScreen?: boolean;
    organizationUnits: CurriculumBuilderProps["organizationUnitOptions"];
    modalityOptions: CurriculumBuilderProps["modalityOptions"];
  }
>();
const emit = defineEmits<{ changed: [message: string] }>();

const unitStyleFor = (
  unit: string | null | undefined,
): (typeof UNIT_PALETTE)[number] => {
  const index = props.organizationUnits.findIndex(
    (option) => option.value === unit,
  );

  return index === -1
    ? FALLBACK_UNIT_STYLE
    : UNIT_PALETTE[index % UNIT_PALETTE.length];
};

const summaryLabel = (fieldId: string, label: string): string =>
  props.fixedFields.find((field) => field.id === fieldId)?.system_label ??
  label;

const legendUnits = computed(() =>
  props.organizationUnits.map((option) => ({
    unit: option.label,
    style: unitStyleFor(option.value),
  })),
);
const summaryRows = computed(() => [
  {
    id: "modality",
    label: "Modalidad",
    value: props.career.modality?.label ?? "—",
  },
  {
    id: "subjects",
    label: "N° asignaturas",
    value: String(props.subjects.length),
  },
  ...props.fixedFieldTotals.map((total) => ({
    id: total.id,
    label: summaryLabel(total.id, total.label),
    value: formatNumericDisplay(total.value),
  })),
]);

const flowId = `curriculum-${props.curriculum.id}`;
const { setEdges, setNodes, updateNode } = useVueFlow(flowId);

const editingSubjectId = ref<string | null>(null);
const draftCycle = ref<number | null>(null);
const dragPreview = ref<{
  subjectId: string;
  cycle: number;
  index: number;
} | null>(null);
const savingLayout = ref(false);
const hasOpenEditor = computed(
  () => editingSubjectId.value !== null || draftCycle.value !== null,
);
const editable = computed(
  () => props.editing && props.curriculum.editable && !props.curriculum.lock_reason,
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
  const sourceIndex = subjects.findIndex(
    (subject) => subject.id === preview.subjectId,
  );
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
      return (
        laneStart +
        subjectsForCycle(cycle).length * subjectStep +
        (editable.value ? subjectStep : 0)
      );
    },
  ).reduce((widest, width) => Math.max(widest, width), 0);

  return Math.max(1120, widestCycle + 200);
});

const navigationExtent = computed<CoordinateExtent>(() => {
  const contentHeight = Math.max(
    laneHeight - laneInset,
    props.curriculum.cycle_count * laneHeight - laneInset,
  );

  return [
    [-navigationPadding, -navigationPadding],
    [laneWidth.value + navigationPadding, contentHeight + navigationPadding],
  ];
});

const subjectById = computed(
  () => new Map(props.subjects.map((subject) => [subject.id, subject])),
);
const editorSubject = computed(() =>
  editingSubjectId.value
    ? (subjectById.value.get(editingSubjectId.value) ?? null)
    : null,
);
const editorCycle = computed(
  () => editorSubject.value?.cycle ?? draftCycle.value ?? 1,
);
const editorPosition = computed(
  () =>
    editorSubject.value?.position ??
    Math.max(
      -1,
      ...subjectsForCycle(editorCycle.value).map((subject) => subject.position),
    ) + 1,
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

const buildNodes = (): Node[] =>
  buildCurriculumNodes({
    career: props.career,
    curriculum: props.curriculum,
    fixedFields: props.fixedFields,
    subjectsForCycle: previewSubjectsForCycle,
    unitStyleFor,
    laneWidth: laneWidth.value,
    editable: editable.value,
    hasOpenEditor: hasOpenEditor.value,
    savingLayout: savingLayout.value,
    draggingSubjectId: dragPreview.value?.subjectId,
    onEdit: beginSubjectEdit,
    onSaved: (message) => {
      if (message) emit("changed", message);
    },
  });

const buildEdges = (): Edge[] =>
  buildRequirementEdges(props.requirements, props.subjects, subjectById.value);

const nodes = ref<Node[]>(buildNodes());
const edges = ref<Edge[]>(buildEdges());

const synchronizeNodePositions = async (): Promise<void> => {
  const nextNodes = buildNodes();
  nodes.value = nextNodes;
  setNodes(nextNodes);
  await nextTick();
  nextNodes
    .filter((item) => item.type === "subject")
    .forEach((item) => {
      updateNode(item.id, (current) => ({
        position: item.position,
        computedPosition: { ...current.computedPosition, ...item.position },
      }));
    });
};

watch(
  () => props.subjects,
  () => {
    dragPreview.value = null;
  },
);

watch(
  [
    () => props.subjects,
    () => props.requirements,
    () => props.organizationUnits,
    () => props.curriculum.cycle_count,
    editable,
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
    node.type === "addSubject" &&
    node.data.disabled !== true &&
    typeof cycle === "number"
  ) {
    beginSubjectCreation(cycle);
  }
};

const pendingConnection = ref<{ sourceId: string; targetId: string } | null>(
  null,
);
const subjectName = (id: string | null | undefined): string =>
  (id && subjectById.value.get(id)?.name) || "materia";

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

const selectedRequirement = ref<CurriculumRequirement | null>(null);

watch(editable, (canEdit) => {
  if (canEdit) return;
  closeEditor();
  pendingConnection.value = null;
  selectedRequirement.value = null;
  dragPreview.value = null;
});

const onEdgeClick = ({ edge }: EdgeMouseEvent): void => {
  if (!editable.value || hasOpenEditor.value) {
    return;
  }

  selectedRequirement.value =
    props.requirements.find((requirement) => requirement.id === edge.id) ??
    null;
};

const onNodeDrag = ({ node }: NodeDragEvent): void => {
  const subject = subjectById.value.get(node.id);
  if (
    !editable.value ||
    savingLayout.value ||
    node.type !== "subject" ||
    !subject ||
    typeof subject.cycle !== "number"
  )
    return;

  const cycleSubjects = subjectsForCycle(subject.cycle);
  const cycleY = (subject.cycle - 1) * laneHeight + subjectOffset;
  const maxX = laneStart + (cycleSubjects.length - 1) * subjectStep;
  const x = Math.max(laneStart, Math.min(maxX, node.position.x));
  const index = Math.max(
    0,
    Math.min(
      cycleSubjects.length - 1,
      Math.round((x - laneStart) / subjectStep),
    ),
  );

  if (
    dragPreview.value?.subjectId !== node.id ||
    dragPreview.value.index !== index
  ) {
    dragPreview.value = { subjectId: node.id, cycle: subject.cycle, index };
  }
  const previewPositions = new Map(
    previewSubjectsForCycle(subject.cycle).map((item, slot) => [item.id, slot]),
  );
  nodes.value = nodes.value.map((current) => {
    if (current.id === node.id)
      return {
        ...current,
        position: { x, y: cycleY },
        zIndex: 10,
      };
    const slot = previewPositions.get(current.id);
    return slot === undefined
      ? current
      : {
          ...current,
          position: { ...current.position, x: laneStart + slot * subjectStep },
        };
  });
};

const onNodeDragStop = async (event: NodeDragEvent): Promise<void> => {
  const { node } = event;
  const subject = subjectById.value.get(node.id);
  if (
    !editable.value ||
    node.type !== "subject" ||
    !subject ||
    typeof subject.cycle !== "number"
  )
    return;
  const originalIndex = subjectsForCycle(subject.cycle).findIndex(
    (item) => item.id === node.id,
  );
  const index =
    dragPreview.value?.subjectId === node.id
      ? dragPreview.value.index
      : originalIndex;
  if (index === originalIndex) {
    dragPreview.value = null;
    await synchronizeNodePositions();
    return;
  }

  savingLayout.value = true;
  await synchronizeNodePositions();
  try {
    const result = await updateSubjectLayout(props.curriculum.id, {
      subject_id: node.id,
      cycle: subject.cycle,
      position: index,
    });
    emit("changed", result.message);
  } catch (reason) {
    dragPreview.value = null;
    await synchronizeNodePositions();
    toast.error(
      reason instanceof ApiError
        ? reason.message
        : "No se pudo mover la materia.",
    );
  } finally {
    savingLayout.value = false;
  }
};
</script>

<template>
  <div
    class="curriculum-canvas relative min-h-136 overflow-hidden rounded-lg border bg-background shadow-surface"
    :class="cn(fullScreen && 'h-(--curriculum-canvas-full-height)', !fullScreen && 'h-(--curriculum-canvas-height)')"
    :aria-label="editing ? 'Editor interactivo de la malla' : 'Vista de la malla'"
  >
    <div class="absolute top-3 right-3 z-10 max-sm:hidden">
      <CurriculumLegendPanel :units="legendUnits" :rows="summaryRows" />
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
      :min-zoom="CANVAS_ZOOM.min"
      :max-zoom="CANVAS_ZOOM.max"
      :translate-extent="navigationExtent"
      :auto-pan-on-node-drag="false"
      :pan-on-scroll="true"
      :pan-on-scroll-speed="1"
      :zoom-on-scroll="false"
      :zoom-on-pinch="true"
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
      <CurriculumNavigationControls :flow-id="flowId" :min-zoom="CANVAS_ZOOM.min" :max-zoom="CANVAS_ZOOM.max" />
      <CurriculumRequirementDialogs
        v-model:pending-connection="pendingConnection"
        v-model:selected-requirement="selectedRequirement"
        :curriculum-id="curriculum.id"
        :editable="editable"
        :subject-name="subjectName"
        @changed="(message) => emit('changed', message)"
      />
    </VueFlow>
    <Dialog
      :open="hasOpenEditor"
      @update:open="
        (open) => {
          if (!open) closeEditor();
        }
      "
    >
      <DialogContent
        class="max-h-(--overlay-max-height) overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>{{
            editorSubject ? "Editar materia" : "Agregar materia"
          }}</DialogTitle>
          <DialogDescription>
            Ciclo {{ toRoman(editorCycle) }}. Complete los datos académicos de
            la materia.
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
          @saved="
            (message) => {
              closeEditor();
              if (message) emit('changed', message);
            }
          "
        />
      </DialogContent>
    </Dialog>
  </div>
</template>
