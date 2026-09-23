<script setup lang="ts">
import { CalendarPlus, LockKeyhole, Pencil, Trash2, UserRoundCog } from '@lucide/vue';
import { ref } from 'vue';
import { deleteAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';
import CoordinatorReplacementSheet from '@/components/domain/academic/CoordinatorReplacementSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import type { CatalogRecord, GovernanceCatalogEntity, Option } from '@/types/academic';

const props = defineProps<{
    entity: GovernanceCatalogEntity; recordId: string; logoUrl?: string | null; recordName: string;
    recordCode?: string | null; active?: boolean; facultyId?: string | null; modality?: string | null;
    campus?: string | null; campusOptions: Array<{ value: string; label: string }>;
    startsOn?: string | null; endsOn?: string | null;
    institutionalProcess?: { id: string; state: 'abierto' | 'pausado' | 'cerrado' } | null;
    faculties: CatalogRecord[]; coordinator?: { id: string; name: string } | null;
    coordinatorUsers?: Option[]; lockReason?: string | null;
}>();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
const coordinatorOpen = ref(false);
const processOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);
const processStateLabel = (state: NonNullable<typeof props.institutionalProcess>['state']): string => ({
    abierto: 'abierta',
    pausado: 'en pausa',
    cerrado: 'cerrada',
}[state]);
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
    <div class="flex justify-end">
        <TableActionsMenu :label="`Acciones para ${recordName}`" :disabled="Boolean(lockReason)">
            <DropdownMenuItem v-if="!lockReason" @select="editOpen = true"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
            <DropdownMenuItem v-else disabled><LockKeyhole aria-hidden="true" />{{ lockReason }}</DropdownMenuItem>
            <DropdownMenuItem v-if="entity === 'periodo' && !institutionalProcess && !lockReason" @select="processOpen = true"><CalendarPlus aria-hidden="true" />Abrir convocatoria</DropdownMenuItem>
            <DropdownMenuItem v-else-if="entity === 'periodo' && institutionalProcess" disabled><LockKeyhole aria-hidden="true" />Convocatoria {{ processStateLabel(institutionalProcess.state) }}</DropdownMenuItem>
            <DropdownMenuItem v-if="entity === 'carrera' && active && !lockReason" @select="coordinatorOpen = true"><UserRoundCog aria-hidden="true" />{{ coordinator ? 'Reemplazar coordinador' : 'Asignar coordinador' }}</DropdownMenuItem>
            <DropdownMenuItem v-if="!lockReason" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
        </TableActionsMenu>

        <CoordinatorReplacementSheet v-if="entity === 'carrera'" :key="`coordinator-${recordId}`" v-model:open="coordinatorOpen" :career-id="recordId" :career-name="recordName" :coordinator="coordinator ?? null" :users="coordinatorUsers ?? []" @saved="emit('changed', $event)" />
        <SyllabusProcessSheet v-if="entity === 'periodo' && !institutionalProcess" v-model:open="processOpen" :template="null" :periods="[]" :period="{ id: recordId, codigo: recordName }" display="menu" trigger-label="Abrir convocatoria" @saved="emit('changed', $event)" />
        <CatalogEditSheet :key="recordId" v-model:open="editOpen" :entity="entity" :record-id="recordId" :record-name="recordName" :record-code="recordCode ?? null" :faculty-id="facultyId" :modality="modality" :campus="campus" :campus-options="campusOptions" :logo-url="logoUrl" :starts-on="startsOn" :ends-on="endsOn" :faculties="faculties" :show-trigger="false" @saved="emit('changed', $event)" />

        <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar registro institucional</DialogTitle><DialogDescription v-if="entity === 'periodo'">Se eliminará el período «{{ recordName }}». Solo puede eliminarse si no tiene materias programadas ni una convocatoria institucional asociada. Si la convocatoria todavía no tiene actividad docente, elimínela primero desde Convocatorias.</DialogDescription><DialogDescription v-else>Se eliminará «{{ recordName }}». La operación se rechazará si tiene carreras, materias programadas, procesos u otro historial relacionado.</DialogDescription></DialogHeader>
            <p v-if="error" class="mb-4 text-sm text-destructive">{{ error }}</p>
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar registro</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
</template>
