<script setup lang="ts">
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import { CalendarPlus, Power, PowerOff, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { deleteAcademicRecord, setAcademicRecordStatus } from '@/api/academic';
import { ApiError } from '@/api/client';
import CatalogEditDialog from '@/components/domain/academic/CatalogEditDialog.vue';
import type { DialogAction } from '@/components/domain/DialogActions.vue';
import SyllabusProcessDialog from '@/components/domain/syllabus/SyllabusProcessDialog.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { afterDialogExit } from '@/lib/dialogExit';
import type { CatalogRecord, GovernanceCatalogEntity } from '@/types/academic';

const props = defineProps<{
    entity: GovernanceCatalogEntity; recordId: string; logoUrl?: string | null; recordName: string;
    recordCode?: string | null; active?: boolean; facultyId?: string | null; modality?: string | null;
    modalityOptions: Array<{ value: string; label: string }>;
    campus?: string | null; campusOptions: Array<{ value: string; label: string }>; catalogLibraries?: string[];
    startsOn?: string | null; endsOn?: string | null;
    institutionalProcess?: { id: string; state: 'abierto' | 'pausado' | 'cerrado' } | null;
    faculties: CatalogRecord[]; lockReason?: string | null; deactivateBlockedReason?: string | null;
}>();
const emit = defineEmits<{ changed: [message: string] }>();
// Al refrescar, el registro cambia (Desactivar pasa a Reactivar) o desaparece: se avisa cuando el modal ya se cerró.
const changedAfterExit = async (message: string): Promise<void> => {
    await afterDialogExit();
    emit('changed', message);
};
const editOpen = ref(false);
const edit = (): void => { editOpen.value = true; };
defineExpose({ edit });
const statusEntity = computed(() => props.entity === 'facultad' || props.entity === 'carrera');
const noun = computed(() => props.entity === 'facultad' ? 'facultad' : 'carrera');
const sheetActions = computed<DialogAction[]>(() => {
    if (props.lockReason) return [];
    const list: DialogAction[] = [];
    if (props.entity === 'periodo' && !props.institutionalProcess) list.push({ key: 'process', label: 'Abrir convocatoria', icon: CalendarPlus });
    // Facultades y carreras no se eliminan: se desactivan y conservan su historial.
    if (statusEntity.value) list.push(props.active ? { key: 'status', label: `Desactivar ${noun.value}`, icon: PowerOff, destructive: true, disabled: Boolean(props.deactivateBlockedReason), disabledReason: props.deactivateBlockedReason ?? undefined } : { key: 'status', label: `Reactivar ${noun.value}`, icon: Power });
    if (props.entity === 'periodo') list.push({ key: 'delete', label: 'Eliminar', icon: Trash2, destructive: true });

    return list;
});
const runAction = (key: string): void => {
    editOpen.value = false;
    if (key === 'process') processOpen.value = true;
    if (key === 'delete') deleteOpen.value = true;
    if (key === 'status') { error.value = null; statusOpen.value = true; }
};
const processOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const statusOpen = ref(false);
const changingStatus = ref(false);
const changeStatus = async (): Promise<void> => {
    if (props.entity !== 'facultad' && props.entity !== 'carrera') return;
    changingStatus.value = true; error.value = null;
    try {
        const result = await setAcademicRecordStatus(props.entity, props.recordId, !props.active);
        statusOpen.value = false;
        await changedAfterExit(result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : `No se pudo cambiar el estado de la ${noun.value}`; }
    finally { changingStatus.value = false; }
};
const error = ref<string | null>(null);
const statusDescription = computed(() => {
    if (props.entity === 'facultad') return props.active ? `«${props.recordName}» no se podrá elegir para carreras nuevas. Su historial se conserva y podrá reactivarla después` : `«${props.recordName}» volverá a estar disponible`;

    return props.active ? `«${props.recordName}» dejará de participar en nuevas convocatorias. Su historial se conserva y podrá reactivarla después` : `«${props.recordName}» volverá a participar en las próximas convocatorias`;
});
const remove = async (): Promise<void> => {
    deleting.value = true; error.value = null;
    try {
        const result = await deleteAcademicRecord(props.entity, props.recordId);
        deleteOpen.value = false;
        await changedAfterExit(result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el registro'; }
    finally { deleting.value = false; }
};
</script>

<template>
    <div class="contents">
        <SyllabusProcessDialog v-if="entity === 'periodo' && !institutionalProcess" v-model:open="processOpen" :template="null" :periods="[]" :period="{ id: recordId, codigo: recordName, starts_on: startsOn ?? undefined, ends_on: endsOn ?? undefined }" display="menu" trigger-label="Abrir convocatoria" @saved="changedAfterExit" />
        <CatalogEditDialog :key="recordId" v-model:open="editOpen" :lock-reason="lockReason ?? null" :entity="entity" :record-id="recordId" :record-name="recordName" :record-code="recordCode ?? null" :faculty-id="facultyId" :modality="modality" :campus="campus" :catalog-libraries="catalogLibraries ?? []" :campus-options="campusOptions" :modality-options="modalityOptions" :logo-url="logoUrl" :starts-on="startsOn" :ends-on="endsOn" :faculties="faculties" :show-trigger="false" :actions="sheetActions" @action="runAction" @saved="emit('changed', $event)" />

        <Dialog v-if="entity === 'periodo'" v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar período</DialogTitle><DialogDescription>Se eliminará «{{ recordName }}». Se rechazará si ya tiene una convocatoria</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar registro</Button></DialogFooter>
        </DialogContent></Dialog>

        <Dialog v-if="statusEntity" v-model:open="statusOpen"><DialogContent><DialogHeader><DialogTitle>{{ active ? `Desactivar ${noun}` : `Reactivar ${noun}` }}</DialogTitle><DialogDescription>{{ statusDescription }}</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" :variant="active ? 'destructive' : 'default'" :disabled="changingStatus" @click="changeStatus"><Spinner v-if="changingStatus" data-icon="inline-start" /><component :is="active ? PowerOff : Power" v-else data-icon="inline-start" aria-hidden="true" />{{ active ? 'Desactivar' : 'Reactivar' }}</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
</template>
