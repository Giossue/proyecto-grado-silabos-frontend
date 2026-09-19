<script setup lang="ts">
import { Eye, Lock, Pencil, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { deleteSource, type Source } from '@/api/sources';
import { ApiError } from '@/api/client';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/lib/routes';

const props = defineProps<{ source: Source; locked: boolean }>();
const router = useRouter();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
const deleteOpen = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);

const remove = async (): Promise<void> => {
  deleting.value = true;
  error.value = null;
  try {
    const result = await deleteSource(props.source.id);
    deleteOpen.value = false;
    emit('changed', result.message);
  } catch (reason) {
    error.value = reason instanceof ApiError ? reason.message : 'No se pudo eliminar la fuente.';
  } finally { deleting.value = false; }
};
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${source.name}`" :disabled="locked">
    <DropdownMenuItem @select="router.push(paths.coordination.source(source.id))"><Eye aria-hidden="true" />Ver fuente</DropdownMenuItem>
    <DropdownMenuItem v-if="!locked" @select="editOpen = true"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
    <DropdownMenuItem v-if="!locked" variant="destructive" @select="deleteOpen = true"><Trash2 aria-hidden="true" />Eliminar</DropdownMenuItem>
    <DropdownMenuItem v-else disabled><Lock aria-hidden="true" />Protegida durante la convocatoria</DropdownMenuItem>
  </TableActionsMenu>
  <AcademicSourceEditSheet v-model:open="editOpen" :source="source" display="menu" @saved="emit('changed', $event)" />
  <Dialog v-model:open="deleteOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Eliminar fuente académica</DialogTitle>
        <DialogDescription>La fuente «{{ source.name }}» dejará de aparecer y no podrá seleccionarse en nuevas convocatorias. Su contenido, PDF e historial se conservarán.</DialogDescription>
      </DialogHeader>
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <DialogFooter>
        <DialogClose as-child><Button type="button" variant="outline">Cancelar</Button></DialogClose>
        <Button type="button" variant="destructive" :disabled="deleting" @click="remove"><Spinner v-if="deleting" data-icon="inline-start" /><Trash2 v-else data-icon="inline-start" aria-hidden="true" />Eliminar fuente</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
