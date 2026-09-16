<script setup lang="ts">
import { Eye, Lock, Pencil } from '@lucide/vue';
import { ref } from 'vue';
import type { Source } from '@/api/sources';
import AcademicSourceEditSheet from '@/components/domain/configuration/AcademicSourceEditSheet.vue';
import TableActionsMenu from '@/components/domain/TableActionsMenu.vue';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

defineProps<{ source: Source; locked: boolean }>();
const emit = defineEmits<{ changed: [message: string] }>();
const editOpen = ref(false);
</script>

<template>
  <TableActionsMenu :label="`Acciones para ${source.name}`">
    <DropdownMenuItem as-child><RouterLink :to="`/coordinacion/fuentes/${source.id}`"><Eye aria-hidden="true" />Ver fuente</RouterLink></DropdownMenuItem>
    <DropdownMenuItem v-if="!locked" @select="editOpen = true"><Pencil aria-hidden="true" />Editar</DropdownMenuItem>
    <DropdownMenuItem v-else disabled><Lock aria-hidden="true" />Protegida durante la convocatoria</DropdownMenuItem>
  </TableActionsMenu>
  <AcademicSourceEditSheet v-model:open="editOpen" :source="source" display="menu" @saved="emit('changed', $event)" />
</template>
