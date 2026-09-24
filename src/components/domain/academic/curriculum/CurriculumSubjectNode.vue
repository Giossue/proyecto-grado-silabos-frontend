<script setup lang="ts">
import { Pencil, Trash2 } from "@lucide/vue";
import { Handle, Position } from "@vue-flow/core";
import { computed, ref } from "vue";
import { ApiError } from "@/api/client";
import { deleteCurriculumSubject } from "@/api/career-academics";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { formatNumericDisplay } from "@/lib/numberDisplay";
import type {
  CurriculumBuilderProps,
  CurriculumBuilderSubject,
  FixedSubjectField,
} from "@/types/academic";

const props = defineProps<{
  data: {
    career: CurriculumBuilderProps["career"];
    curriculum: CurriculumBuilderProps["curriculum"];
    fixedFields: FixedSubjectField[];
    subject: CurriculumBuilderSubject;
    unitStyle: { backgroundColor: string; color: string };
    editable: boolean;
    onEdit: () => void;
    onSaved: (message?: string) => void;
  };
  dragging?: boolean;
}>();

const deleteOpen = ref(false);
const deleting = ref(false);
const deleteError = ref<string | null>(null);
const deleteSubject = async (): Promise<void> => {
  const subject = props.data.subject;
  if (!subject) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    const result = await deleteCurriculumSubject(
      props.data.curriculum.id,
      subject.id,
    );
    deleteOpen.value = false;
    props.data.onSaved(result.message);
  } catch (reason) {
    deleteError.value =
      reason instanceof ApiError
        ? reason.message
        : "No se pudo eliminar la materia.";
  } finally {
    deleting.value = false;
  }
};

const formatFieldValue = formatNumericDisplay;

const totalFieldIds = computed(
  () =>
    new Set(
      props.data.fixedFields
        .filter((field) => field.system_key === "total_hours")
        .map((field) => field.id),
    ),
);

const regularFields = computed(
  () =>
    props.data.subject?.display_fields.filter(
      (field) => !totalFieldIds.value.has(field.id),
    ) ?? [],
);

const totalFields = computed(
  () =>
    props.data.subject?.display_fields.filter((field) =>
      totalFieldIds.value.has(field.id),
    ) ?? [],
);
</script>

<template>
  <template v-if="data.subject">
    <Handle
      type="target"
      :position="Position.Top"
      :connectable="data.editable"
      aria-label="Recibir relación académica"
    />
    <!--
            El puntero dice qué se puede hacer donde está: mano abierta sobre el
            cuerpo de la tarjeta y cerrada mientras se arrastra. Los botones de
            dentro y las líneas de relación conservan el suyo de pulsación.
        -->
    <article
      class="relative w-[17.125rem] cursor-grab overflow-hidden rounded-md bg-card text-card-foreground shadow-surface ring-1 ring-surface-ring active:cursor-grabbing data-[dragging=true]:shadow-menu data-[dragging=true]:ring-2 data-[dragging=true]:ring-ring"
      :data-dragging="dragging"
      :aria-label="`${data.subject.code}: ${data.subject.name}`"
    >
      <div
        class="nodrag nopan absolute top-1 right-1"
        @click.stop
        @mousedown.stop
      >
        <TableActionsMenu
          :label="`Acciones para ${data.subject.name}`"
          :disabled="!data.editable"
        >
          <DropdownMenuItem @select="data.onEdit">
            <Pencil aria-hidden="true" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" @select="deleteOpen = true">
            <Trash2 aria-hidden="true" />
            Eliminar
          </DropdownMenuItem>
        </TableActionsMenu>
      </div>

      <div class="flex h-24">
        <div
          class="flex w-9 shrink-0 items-center justify-center border-r bg-muted px-1 py-2"
        >
          <span
            class="-rotate-90 text-[0.65rem] font-semibold whitespace-nowrap"
          >
            {{ data.subject.code }}
          </span>
        </div>
        <div
          class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 p-2 pr-9 text-center"
        >
          <Badge
            v-if="data.subject.organization_unit_label"
            variant="secondary"
            :style="data.unitStyle"
          >
            {{ data.subject.organization_unit_label }}
          </Badge>
          <h3 class="line-clamp-3 text-xs leading-snug font-semibold uppercase">
            {{ data.subject.name }}
          </h3>
        </div>
      </div>

      <!-- Modalidad efectiva: la propia de la materia o la base de la carrera. -->
      <p
        class="border-t px-2 py-0.5 text-center text-[0.65rem] tracking-wide text-muted-foreground uppercase"
      >
        {{
          data.subject.modality_label ??
          data.career.modality?.label ??
          "Sin modalidad"
        }}
      </p>

      <dl
        v-if="data.subject.display_fields.length > 0"
        class="border-t bg-muted/40"
      >
        <div
          v-if="regularFields.length > 0"
          class="grid"
          :style="{
            gridTemplateColumns: `repeat(${regularFields.length}, minmax(0, 1fr))`,
          }"
        >
          <div
            v-for="field in regularFields"
            :key="field.id"
            class="border-r text-center last:border-r-0"
          >
            <dt
              class="bg-muted px-1 py-1 text-[0.6rem] font-semibold text-muted-foreground"
            >
              {{ field.label }}
            </dt>
            <dd class="px-1 py-1 text-xs font-medium">
              {{ formatFieldValue(field.value) }}
            </dd>
          </div>
        </div>
        <div
          v-for="field in totalFields"
          :key="field.id"
          class="text-center"
          :class="{ 'border-t': regularFields.length > 0 }"
        >
          <dt
            class="bg-muted px-1 py-1 text-[0.6rem] font-semibold text-muted-foreground"
          >
            {{ field.label }}
          </dt>
          <dd class="px-1 py-1 text-xs font-medium">
            {{ formatFieldValue(field.value) }}
          </dd>
        </div>
      </dl>
    </article>

    <Dialog v-model:open="deleteOpen">
      <DialogContent class="nodrag nopan" @mousedown.stop @keydown.stop>
        <DialogHeader>
          <DialogTitle>Eliminar materia</DialogTitle>
          <DialogDescription>
            Se eliminará «{{ data.subject.name }}» junto con sus relaciones
            académicas. Esta acción solo se completará si la materia no tiene
            programaciones ni sílabos relacionados.
          </DialogDescription>
        </DialogHeader>

        <p v-if="deleteError" class="mb-4 text-sm text-destructive">
          {{ deleteError }}
        </p>
        <DialogFooter>
          <DialogClose as-child>
            <Button type="button" variant="outline" :disabled="deleting">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            :disabled="deleting"
            @click="deleteSubject"
          >
            <Spinner v-if="deleting" data-icon="inline-start" />
            <Trash2 v-else data-icon="inline-start" aria-hidden="true" />
            Eliminar materia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Handle
      type="source"
      :position="Position.Bottom"
      :connectable="data.editable"
      aria-label="Crear relación académica"
    />
  </template>
</template>
