<script setup lang="ts">
import { LockKeyhole, Plus, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { deleteCareerRecord, deleteScheduledSubject } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import ParallelCreationSheet from '@/components/domain/academic/ParallelCreationSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

// Coordinación no edita en sitio: la materia programada se prepara por período y el
// docente de un paralelo cambia solo con el relevo.
type CareerAcademicEntity = 'programacion_asignatura' | 'asignacion_docente';
type CareerAcademicRecord = { id: string; parallels?: { id: string; code: string; shift: string | null }[] };

const props = withDefaults(defineProps<{
    entity: CareerAcademicEntity; record: CareerAcademicRecord; recordLabel: string; editable: boolean;
    active?: boolean; deleteSupported?: boolean; parallelCreationSupported?: boolean;
    lockedLabel?: string; allowLockedActions?: boolean;
}>(), { active: true, deleteSupported: false, parallelCreationSupported: false, allowLockedActions: false });
const emit = defineEmits<{ changed: [message: string] }>();
const deleteOpen = ref(false); const parallelCreationOpen = ref(false); const processing = ref(false); const error = ref<string | null>(null);
const deletionTitle = computed(() => props.entity === 'programacion_asignatura' ? 'Eliminar materia programada' : 'Eliminar asignación docente');
const deletionDescription = computed(() => props.entity === 'programacion_asignatura' ? 'Se eliminarán también sus paralelos y asignaciones docentes. La operación se rechazará si existe algún sílabo relacionado, para conservar su historial.' : 'La operación se rechazará si el registro ya forma parte de un sílabo. Use el relevo docente para cambiar responsables de expedientes existentes.');
const actionsDisabled = computed(() => !props.editable || Boolean(props.lockedLabel));
const menuDisabled = computed(() => actionsDisabled.value && !props.allowLockedActions);
const disabledLabel = computed(() => props.lockedLabel ?? 'Con historial: este registro queda protegido');
const remove = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = props.entity === 'programacion_asignatura' ? await deleteScheduledSubject(props.record.id) : await deleteCareerRecord(props.entity, props.record.id); deleteOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el registro.'; } finally { processing.value = false; } };
</script>

<template><div class="flex justify-end"><TableActionsMenu :label="`Acciones para ${recordLabel}`" :disabled="menuDisabled">
    <DropdownMenuItem v-if="actionsDisabled" disabled><LockKeyhole aria-hidden="true" />{{ disabledLabel }}</DropdownMenuItem>
    <slot />
    <DropdownMenuItem v-if="entity === 'programacion_asignatura' && parallelCreationSupported && !actionsDisabled" @select="parallelCreationOpen = true"><Plus aria-hidden="true" />Agregar paralelo</DropdownMenuItem>
    <DropdownMenuItem v-if="deleteSupported && !actionsDisabled" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
</TableActionsMenu>
<ParallelCreationSheet v-if="entity === 'programacion_asignatura'" :key="`parallel-${record.id}`" v-model:open="parallelCreationOpen" :scheduled-subject-id="record.id" :scheduled-subject-label="recordLabel" :parallels="record.parallels ?? []" @saved="emit('changed', $event)" />
<Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>{{ deletionTitle }}</DialogTitle><DialogDescription>{{ deletionDescription }}</DialogDescription></DialogHeader><p v-if="error" class="mb-4 text-sm text-destructive">{{ error }}</p><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="processing" @click="remove"><Spinner v-if="processing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />{{ deletionTitle }}</Button></DialogFooter></DialogContent></Dialog>
</div></template>
