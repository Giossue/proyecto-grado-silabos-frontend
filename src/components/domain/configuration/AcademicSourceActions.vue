<script setup lang="ts">
import { Eye, Lock, Pencil } from '@lucide/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Source } from '@/api/sources';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { paths } from '@/lib/routes';

defineProps<{ source: Source; locked: boolean }>();
const router = useRouter();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${source.name}`" :disabled="locked">
    <DropdownMenuItem @select="router.push(paths.coordination.source(source.id))"><Eye aria-hidden="true" />Ver fuente</DropdownMenuItem>
    <DropdownMenuItem v-if="!locked" @select="editOpen = true"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
    <DropdownMenuItem v-else disabled><Lock aria-hidden="true" />Protegida durante la convocatoria</DropdownMenuItem>
  </TableActionsMenu>
  <AcademicSourceEditSheet v-model:open="editOpen" :source="source" display="menu" @saved="emit('changed', $event)" />
</template>
