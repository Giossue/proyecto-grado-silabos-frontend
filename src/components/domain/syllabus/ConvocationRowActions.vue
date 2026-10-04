<script setup lang="ts">
import { CalendarPlus, LockKeyhole, Pencil, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { deleteAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
import type { SyllabusProcess } from '@/api/processes';
import CatalogEditSheet from '@/components/domain/academic/CatalogEditSheet.vue';
import FeedbackAlert from '@/components/domain/FeedbackAlert.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import SyllabusProcessActions from '@/components/domain/syllabus/SyllabusProcessActions.vue';
import SyllabusProcessSheet from '@/components/domain/syllabus/SyllabusProcessSheet.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import type { ConvocationRow } from '@/pages/AdminProcessesPage.vue';

const props = defineProps<{ row: ConvocationRow }>();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
const processOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);

const remove = async (): Promise<void> => {
    deleting.value = true; error.value = null;
    try {
        const result = await deleteAcademicRecord('periodo', props.row.id);
        deleteOpen.value = false;
        emit('changed', result.message);
    } catch (reason) { error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar el periodo.'; }
    finally { deleting.value = false; }
};
const periodFor = (process: SyllabusProcess) => ({ id: process.period_id, codigo: process.period_name });
</script>

<template>
    <div class="flex justify-end">
        <!-- Con convocatoria abierta mandan las acciones del proceso; el periodo solo se edita si no está bloqueado. -->
        <SyllabusProcessActions v-if="row.process" :process="row.process" @completed="emit('changed', $event)">
            <DropdownMenuItem v-if="!row.lock_reason" @select="editOpen = true"><Pencil aria-hidden="true" />Editar fechas del periodo</DropdownMenuItem>
            <DropdownMenuItem v-else disabled><LockKeyhole aria-hidden="true" />{{ row.lock_reason }}</DropdownMenuItem>
        </SyllabusProcessActions>
        <TableActionsMenu v-else :label="`Acciones para ${row.code}`" :disabled="Boolean(row.lock_reason)">
            <DropdownMenuItem v-if="!row.lock_reason" @select="processOpen = true"><CalendarPlus aria-hidden="true" />Abrir convocatoria</DropdownMenuItem>
            <DropdownMenuItem v-if="!row.lock_reason" @select="editOpen = true"><Pencil aria-hidden="true" />Editar fechas del periodo</DropdownMenuItem>
            <DropdownMenuItem v-else disabled><LockKeyhole aria-hidden="true" />{{ row.lock_reason }}</DropdownMenuItem>
            <DropdownMenuItem v-if="!row.lock_reason" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar periodo</DropdownMenuItem>
        </TableActionsMenu>

        <SyllabusProcessSheet v-if="!row.process" v-model:open="processOpen" :template="null" :periods="[]" :period="{ id: row.id, codigo: row.code, starts_on: row.starts_on, ends_on: row.ends_on }" display="menu" trigger-label="Abrir convocatoria" @saved="emit('changed', $event)" />
        <CatalogEditSheet :key="row.id" v-model:open="editOpen" entity="periodo" :record-id="row.id" :record-name="row.code" :record-code="row.code" :starts-on="row.starts_on" :ends-on="row.ends_on" :faculties="[]" :campus-options="[]" :modality-options="[]" :show-trigger="false" @saved="emit('changed', $event)" />

        <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar periodo</DialogTitle><DialogDescription>Se eliminará el período «{{ row.code }}». Solo puede eliminarse si no tiene materias programadas.</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar periodo</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
</template>
