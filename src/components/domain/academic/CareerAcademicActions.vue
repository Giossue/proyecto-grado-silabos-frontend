<script setup lang="ts">
import { LockKeyhole, Pencil, Plus, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { deleteCareerRecord, deleteScheduledSubject } from '@/api/career-academics';
import { ApiError } from '@/api/client';
import CareerAcademicEditSheet, { type CareerAcademicEditableRecord, type CareerAcademicEntity, type CareerAcademicOptions } from '@/components/domain/academic/CareerAcademicEditSheet.vue';
import ParallelCreationSheet from '@/components/domain/academic/ParallelCreationSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';

const props = withDefaults(defineProps<{
    entity: CareerAcademicEntity; record: CareerAcademicEditableRecord; recordLabel: string; editable: boolean;
    active?: boolean; editSupported?: boolean; deleteSupported?: boolean; parallelCreationSupported?: boolean;
    lockedLabel?: string; options: CareerAcademicOptions;
}>(), { active: true, editSupported: true, deleteSupported: false, parallelCreationSupported: false });
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false); const deleteOpen = ref(false); const parallelCreationOpen = ref(false); const processing = ref(false); const error = ref<string | null>(null);
const deletionTitle = computed(() => props.entity === 'programacion_asignatura' ? 'Eliminar materia programada' : props.entity === 'paralelo' ? 'Eliminar paralelo' : 'Eliminar asignación docente');
const deletionDescription = computed(() => props.entity === 'programacion_asignatura' ? 'Se eliminarán también sus paralelos y asignaciones docentes. La operación se rechazará si existe algún sílabo relacionado, para conservar su historial.' : 'La operación se rechazará si el registro ya forma parte de un sílabo. Use el relevo docente para cambiar responsables de expedientes existentes.');
const actionsDisabled = computed(() => !props.editable || Boolean(props.lockedLabel));
const disabledLabel = computed(() => props.lockedLabel ?? 'Con historial: este registro queda protegido');
const remove = async (): Promise<void> => { processing.value = true; error.value = null; try { const result = props.entity === 'programacion_asignatura' ? await deleteScheduledSubject(props.record.id) : await deleteCareerRecord(props.entity, props.record.id); deleteOpen.value = false; emit('changed', result.message); } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el registro.'; } finally { processing.value = false; } };
</script>

<template><div class="flex justify-end"><TableActionsMenu :label="`Acciones para ${recordLabel}`" :disabled="actionsDisabled">
    <DropdownMenuItem v-if="editSupported && !actionsDisabled" @select="editOpen = true"><Pencil aria-hidden="true" />Editar</DropdownMenuItem><DropdownMenuItem v-else-if="actionsDisabled" disabled><LockKeyhole aria-hidden="true" />{{ disabledLabel }}</DropdownMenuItem>
    <slot />
    <DropdownMenuItem v-if="entity === 'programacion_asignatura' && parallelCreationSupported && !actionsDisabled" @select="parallelCreationOpen = true"><Plus aria-hidden="true" />Agregar paralelo</DropdownMenuItem>
    <DropdownMenuItem v-if="deleteSupported && !actionsDisabled" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
</TableActionsMenu>
<CareerAcademicEditSheet v-if="editSupported" :key="record.id" v-model:open="editOpen" :entity="entity" :record="record" :options="options" @saved="emit('changed', $event)" />
<ParallelCreationSheet v-if="entity === 'programacion_asignatura'" :key="`parallel-${record.id}`" v-model:open="parallelCreationOpen" :scheduled-subject-id="record.id" :scheduled-subject-label="recordLabel" :parallels="record.parallels ?? []" @saved="emit('changed', $event)" />
<Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>{{ deletionTitle }}</DialogTitle><DialogDescription>{{ deletionDescription }}</DialogDescription></DialogHeader><p v-if="error" class="mb-4 text-sm text-destructive">{{ error }}</p><DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="processing" @click="remove"><Spinner v-if="processing" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />{{ deletionTitle }}</Button></DialogFooter></DialogContent></Dialog>
</div></template>
