<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { CalendarPlus, Power, PowerOff, Trash2, UserRoundCog } from '@lucide/vue';
import { computed, ref } from 'vue';
import { deleteAcademicRecord, setAcademicRecordStatus } from '@/api/academic';
import { ApiError } from '@/api/client';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';
import type { SheetAction } from '@/components/domain/SheetActions.vue';
import CoordinatorReplacementSheet from '@/components/domain/academic/CoordinatorReplacementSheet.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import type { CatalogRecord, GovernanceCatalogEntity, Option } from '@/types/academic';

const props = defineProps<{
    entity: GovernanceCatalogEntity; recordId: string; logoUrl?: string | null; recordName: string;
    recordCode?: string | null; active?: boolean; facultyId?: string | null; modality?: string | null;
    modalityOptions: Array<{ value: string; label: string }>;
    campus?: string | null; campusOptions: Array<{ value: string; label: string }>;
    startsOn?: string | null; endsOn?: string | null;
    institutionalProcess?: { id: string; state: 'abierto' | 'pausado' | 'cerrado' } | null;
    faculties: CatalogRecord[]; coordinator?: { id: string; name: string } | null;
    coordinatorUsers?: Option[]; lockReason?: string | null; deleteBlockedReason?: string | null;
}>();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
const edit = (): void => { if (!props.lockReason) editOpen.value = true; };
defineExpose({ edit });
const sheetActions = computed<SheetAction[]>(() => {
    if (props.lockReason) return [];
    const list: SheetAction[] = [];
    if (props.entity === 'periodo' && !props.institutionalProcess) list.push({ key: 'process', label: 'Abrir convocatoria', icon: CalendarPlus });
    if (props.entity === 'carrera' && props.active) list.push({ key: 'coordinator', label: props.coordinator ? 'Reemplazar coordinador' : 'Asignar coordinador', icon: UserRoundCog });
    if (props.entity === 'carrera') list.push(props.active ? { key: 'status', label: 'Desactivar carrera', icon: PowerOff } : { key: 'status', label: 'Reactivar carrera', icon: Power });
    list.push({ key: 'delete', label: 'Eliminar', icon: Trash2, destructive: true, disabled: Boolean(props.deleteBlockedReason), disabledReason: props.deleteBlockedReason ?? undefined });

    return list;
});
const runAction = (key: string): void => {
    editOpen.value = false;
    if (key === 'process') processOpen.value = true;
    if (key === 'coordinator') coordinatorOpen.value = true;
    if (key === 'delete') deleteOpen.value = true;
    if (key === 'status') { error.value = null; statusOpen.value = true; }
};
const coordinatorOpen = ref(false);
const processOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const statusOpen = ref(false);
const changingStatus = ref(false);
const changeStatus = async (): Promise<void> => {
    if (props.entity !== 'carrera') return;
    changingStatus.value = true; error.value = null;
    try {
        const result = await setAcademicRecordStatus('carrera', props.recordId, !props.active);
        statusOpen.value = false;
        emit('changed', result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo cambiar el estado de la carrera.'; }
    finally { changingStatus.value = false; }
};
const error = ref<string | null>(null);
const remove = async (): Promise<void> => {
    deleting.value = true; error.value = null;
    try {
        const result = await deleteAcademicRecord(props.entity, props.recordId);
        deleteOpen.value = false;
        emit('changed', result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el registro.'; }
    finally { deleting.value = false; }
};
</script>

<template>
    <div class="contents">
        <CoordinatorReplacementSheet v-if="entity === 'carrera'" :key="`coordinator-${recordId}`" v-model:open="coordinatorOpen" :career-id="recordId" :career-name="recordName" :coordinator="coordinator ?? null" :users="coordinatorUsers ?? []" @saved="emit('changed', $event)" />
        <SyllabusProcessSheet v-if="entity === 'periodo' && !institutionalProcess" v-model:open="processOpen" :template="null" :periods="[]" :period="{ id: recordId, codigo: recordName, starts_on: startsOn ?? undefined, ends_on: endsOn ?? undefined }" display="menu" trigger-label="Abrir convocatoria" @saved="emit('changed', $event)" />
        <CatalogEditSheet :key="recordId" v-model:open="editOpen" :entity="entity" :record-id="recordId" :record-name="recordName" :record-code="recordCode ?? null" :faculty-id="facultyId" :modality="modality" :campus="campus" :campus-options="campusOptions" :modality-options="modalityOptions" :logo-url="logoUrl" :starts-on="startsOn" :ends-on="endsOn" :faculties="faculties" :show-trigger="false" :actions="sheetActions" @action="runAction" @saved="emit('changed', $event)" />

        <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar registro institucional</DialogTitle><DialogDescription>Se eliminará «{{ recordName }}». La operación se rechazará si tiene carreras, materias programadas, procesos u otro historial relacionado.</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar registro</Button></DialogFooter>
        </DialogContent></Dialog>

        <Dialog v-if="entity === 'carrera'" v-model:open="statusOpen"><DialogContent><DialogHeader><DialogTitle>{{ active ? 'Desactivar carrera' : 'Reactivar carrera' }}</DialogTitle><DialogDescription>{{ active ? `«${recordName}» dejará de participar en nuevas convocatorias. Su historial se conserva y podrá reactivarla después.` : `«${recordName}» volverá a participar en las próximas convocatorias.` }}</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" :variant="active ? 'destructive' : 'default'" :disabled="changingStatus" @click="changeStatus"><Spinner v-if="changingStatus" data-icon="inline-start" /><component :is="active ? PowerOff : Power" v-else data-icon="inline-start" aria-hidden="true" />{{ active ? 'Desactivar' : 'Reactivar' }}</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
</template>
