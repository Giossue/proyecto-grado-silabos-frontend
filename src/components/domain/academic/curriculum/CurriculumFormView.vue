<script setup lang="ts">
import { LockKeyhole, Pencil, Trash2 } from "@lucide/vue";
import { computed, ref } from "vue";
import { ApiError } from "@/api/client";
import { deleteSubjectRequirement, type Curriculum } from "@/api/career-academics";
import TableActionsMenu from "@/components/domain/TableActionsMenu.vue";
import TablePagination from "@/components/domain/TablePagination.vue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientPagination } from "@/composables/useClientPagination";
import { formatNumericDisplay } from "@/lib/numberDisplay";

const props = defineProps<{ data: Curriculum }>();
const emit = defineEmits<{ edit: [subject: Curriculum["subjects"][number]]; changed: [message: string]; failed: [message: string] }>();
const deleting = ref<string | null>(null);
const editable = computed(() => props.data.curriculum.editable && !props.data.curriculum.lock_reason);
const subjectById = computed(() => new Map(props.data.subjects.map((item) => [item.id, item])));
const { items: subjects, meta: subjectMeta, setPage: setSubjectPage } = useClientPagination(() => props.data.subjects);
const { items: requirements, meta: requirementMeta, setPage: setRequirementPage } = useClientPagination(() => props.data.requirements);
const removeRequirement = async (id: string) => {
  if (!editable.value) return;
  deleting.value = id;
  try {
    const result = await deleteSubjectRequirement(props.data.curriculum.id, id);
    emit("changed", result.message);
  } catch (reason) {
    emit("failed", reason instanceof ApiError ? reason.message : "No se pudo eliminar la relación.");
  } finally { deleting.value = null; }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card><CardHeader><CardTitle>Materias de la malla</CardTitle><CardDescription>Desglose completo de materias, ciclos, unidades de organización y componentes académicos fijos.</CardDescription></CardHeader>
      <CardContent class="flex flex-col gap-4"><div class="overflow-x-auto"><Table data-cards="true" data-overflows="true">
        <TableHeader><TableRow><TableHead>Materia</TableHead><TableHead>Ciclo</TableHead><TableHead>Unidad</TableHead><TableHead>Modalidad</TableHead><TableHead v-for="field in data.fixedFields" :key="field.id" data-card-hidden="true">{{ field.label }}</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader>
        <TableBody><TableEmpty v-if="!subjects.length" :colspan="5 + data.fixedFields.length">No hay materias en esta malla.</TableEmpty>
          <TableRow v-for="subject in subjects" v-else :key="subject.id"><TableCell><div>{{ subject.name }}</div><div class="text-sm text-muted-foreground">{{ subject.code }}</div></TableCell><TableCell>{{ subject.cycle ?? "—" }}</TableCell><TableCell data-card-hidden="true">{{ subject.organization_unit ?? "—" }}</TableCell><TableCell data-card-hidden="true">{{ subject.modality_label ?? data.career.modality?.label ?? "—" }}</TableCell><TableCell v-for="field in subject.display_fields" :key="field.id" data-card-hidden="true">{{ formatNumericDisplay(field.value) }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para ${subject.name}`"><DropdownMenuItem v-if="editable" @select="emit('edit', subject)"><Pencil aria-hidden="true" />Editar</DropdownMenuItem><DropdownMenuItem v-else disabled><LockKeyhole aria-hidden="true" />Malla sin permiso de edición</DropdownMenuItem></TableActionsMenu></TableCell></TableRow>
        </TableBody>
      </Table></div><TablePagination :meta="subjectMeta" mode="client" label="Paginación de materias de la malla" @update:page="setSubjectPage" /></CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Relaciones</CardTitle><CardDescription>El tipo se conserva explícitamente; el color de una flecha nunca decide su significado.</CardDescription></CardHeader>
      <CardContent class="flex flex-col gap-4"><div class="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Materia requerida</TableHead><TableHead>Materia destino</TableHead><TableHead>Tipo</TableHead><TableHead class="text-right">Acciones</TableHead></TableRow></TableHeader><TableBody>
        <TableEmpty v-if="!requirements.length" :colspan="4">No existen relaciones académicas.</TableEmpty>
        <TableRow v-for="item in requirements" v-else :key="item.id"><TableCell>{{ subjectById.get(item.requirement_id)?.name ?? "Materia no disponible" }}</TableCell><TableCell>{{ subjectById.get(item.subject_id)?.name ?? "Materia no disponible" }}</TableCell><TableCell>{{ item.type === "correquisito" ? "Correquisito" : "Prerrequisito" }}</TableCell><TableCell class="text-right"><TableActionsMenu :label="`Acciones para la relación hacia ${subjectById.get(item.subject_id)?.name ?? 'materia'}`"><DropdownMenuItem v-if="editable" variant="destructive" :disabled="deleting === item.id" @select="removeRequirement(item.id)"><Spinner v-if="deleting === item.id" /><Trash2 v-else aria-hidden="true" />Eliminar relación</DropdownMenuItem><DropdownMenuItem v-else disabled><LockKeyhole aria-hidden="true" />Malla sin permiso de edición</DropdownMenuItem></TableActionsMenu></TableCell></TableRow>
      </TableBody></Table></div><TablePagination :meta="requirementMeta" mode="client" label="Paginación de relaciones académicas" @update:page="setRequirementPage" /></CardContent>
    </Card>
  </div>
</template>
