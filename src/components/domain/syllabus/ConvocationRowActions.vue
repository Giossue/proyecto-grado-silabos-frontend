<script setup lang="ts">
import { CalendarPlus, LockKeyhole, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { deleteAcademicRecord } from '@/api/academic';
import { ApiError } from '@/api/client';
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
</script>

<template>
    <div class="flex justify-end">
        <!-- El periodo no se edita nunca: con convocatoria mandan las acciones del proceso; sin ella, abrir o eliminar. -->
        <SyllabusProcessActions v-if="row.process" :process="row.process" @completed="emit('changed', $event)" />
        <TableActionsMenu v-else :label="`Acciones para ${row.code}`" :disabled="Boolean(row.lock_reason)">
            <DropdownMenuItem v-if="!row.lock_reason" @select="processOpen = true"><CalendarPlus aria-hidden="true" />Abrir convocatoria</DropdownMenuItem>
            <DropdownMenuItem v-if="row.lock_reason" disabled><LockKeyhole aria-hidden="true" />{{ row.lock_reason }}</DropdownMenuItem>
            <DropdownMenuItem v-if="!row.lock_reason" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar periodo</DropdownMenuItem>
        </TableActionsMenu>

        <SyllabusProcessSheet v-if="!row.process" v-model:open="processOpen" :template="null" :periods="[]" :period="{ id: row.id, codigo: row.code, starts_on: row.starts_on, ends_on: row.ends_on }" display="menu" trigger-label="Abrir convocatoria" @saved="emit('changed', $event)" />

        <Dialog v-model:open="deleteOpen"><DialogContent><DialogHeader><DialogTitle>Eliminar periodo</DialogTitle><DialogDescription>Se eliminará el período «{{ row.code }}» junto con las materias, paralelos y docentes que las coordinaciones hayan programado en él. Esta acción no se puede deshacer.</DialogDescription></DialogHeader>
            <FeedbackAlert v-if="error" :message="error" />
            <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose><Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar periodo</Button></DialogFooter>
        </DialogContent></Dialog>
    </div>
</template>
