<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { LockKeyhole, Plus, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { deleteCareerRecord } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import ParallelCreationSheet from '@/components/domain/academic/ParallelCreationSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

type CareerAcademicEntity = 'materia' | 'asignacion_docente';
type CareerAcademicRecord = { id?: string; subject_id?: string; period_id?: string; parallels?: { id: string; code: string; shift: string | null; editable?: boolean; deletable?: boolean }[] };

const props = withDefaults(defineProps<{
    shiftOptions?: Array<{ value: string; label: string }>;
    teacherUsers?: Array<{ id: string; name: string; email: string }>;
    assignments?: Array<{ id: string; parallel_id: string; user_id: string; user_name: string; active: boolean; editable: boolean }>;
    entity: CareerAcademicEntity; record: CareerAcademicRecord; recordLabel: string; editable: boolean;
    active?: boolean; deleteSupported?: boolean; parallelCreationSupported?: boolean;
    lockedLabel?: string; allowLockedActions?: boolean;
}>(), { active: true, deleteSupported: false, parallelCreationSupported: false, allowLockedActions: false });
const emit = defineEmits<{ changed: [message: string] }>();
const deleteOpen = ref(false); const parallelCreationOpen = ref(false); const processing = ref(false); const error = ref<string | null>(null);
const deletionTitle = 'Quitar docente del paralelo';
const deletionDescription = computed(() => 'El sílabo del paralelo se conserva tal como está. Quien se asigne después al paralelo continúa con él; mientras tanto nadie lo edita.');
const deleteLabel = 'Quitar';
const actionsDisabled = computed(() => !props.editable || Boolean(props.lockedLabel));
const menuDisabled = computed(() => actionsDisabled.value && !props.allowLockedActions);
const disabledLabel = computed(() => props.lockedLabel ?? 'Con historial: este registro queda protegido');
const remove = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = await deleteCareerRecord(props.entity, props.record.id ?? ''); deleteOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el registro.'; } finally { processing.value = false; } };
</script>

<template><div class="flex justify-end"><TableActionsMenu :label="`Acciones para ${recordLabel}`" :disabled="menuDisabled">
    <DropdownMenuItem v-if="actionsDisabled" disabled><LockKeyhole aria-hidden="true" />{{ disabledLabel }}</DropdownMenuItem>
    <slot />
    <DropdownMenuItem v-if="entity === 'materia' && parallelCreationSupported && !actionsDisabled" @select="parallelCreationOpen = true"><Plus aria-hidden="true" />Paralelos y docentes</DropdownMenuItem>
    <DropdownMenuItem v-if="deleteSupported && !actionsDisabled" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />{{ deleteLabel }}</DropdownMenuItem>
</TableActionsMenu>
<ParallelCreationSheet v-if="entity === 'materia'" :key="`parallel-${record.subject_id}-${record.period_id}`" v-model:open="parallelCreationOpen" :subject-id="record.subject_id ?? ''" :period-id="record.period_id ?? ''" :subject-label="recordLabel" :parallels="record.parallels ?? []" :shift-options="shiftOptions ?? []" :teacher-users="teacherUsers" :assignments="assignments" @saved="emit('changed', $event)" @changed="emit('changed', $event)" />
<Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>{{ deletionTitle }}</DialogTitle><DialogDescription>{{ deletionDescription }}</DialogDescription></DialogHeader><FeedbackAlert v-if="error" :message="error" /><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="processing" @click="remove"><Spinner v-if="processing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />{{ deletionTitle }}</Button></DialogFooter></DialogContent></Dialog>
</div></template>
