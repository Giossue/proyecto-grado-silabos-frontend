<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListTree, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import type { CurriculumRequirement } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFocusReturn } from '@/lib/focusReturn';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';

defineProps<{
    requirements: CurriculumRequirement[];
    editable: boolean;
    subjectName: (id: string | null | undefined) => string;
}>();
const emit = defineEmits<{ select: [requirement: CurriculumRequirement] }>();
const open = ref(false);
useFocusReturn(() => open.value);

const remove = (requirement: CurriculumRequirement): void => {
    open.value = false;
    emit('select', requirement);
};
</script>

<template>
    <Button type="button" variant="outline" size="sm" class="absolute top-3 left-3 z-10 bg-card" @click="open = true">
        <ListTree data-icon="inline-start" aria-hidden="true" />
        Relaciones
    </Button>
    <Dialog v-model:open="open">
        <DialogContent :aria-describedby="undefined" class="max-h-(--overlay-max-height) flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <ScrollArea class="min-h-0 flex-1 [&>[data-slot=scroll-area-viewport]]:max-h-[calc(100dvh-2rem)]">
                <div class="grid gap-4 p-6">
                    <DialogHeader>
                        <DialogTitle>Relaciones académicas</DialogTitle>
                    </DialogHeader>
                    <Table label="Relaciones académicas de la malla">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Materia requerida</TableHead>
                                <TableHead>Materia que la requiere</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead v-if="editable"><span class="sr-only">Acciones</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableEmpty v-if="requirements.length === 0" :colspan="editable ? 4 : 3">La malla todavía no tiene relaciones.</TableEmpty>
                            <TableRow v-for="requirement in requirements" v-else :key="requirement.id">
                                <TableCell>{{ subjectName(requirement.requirement_id) }}</TableCell>
                                <TableCell>{{ subjectName(requirement.subject_id) }}</TableCell>
                                <TableCell>{{ requirement.type === 'correquisito' ? 'Correquisito' : 'Prerrequisito' }}</TableCell>
                                <TableCell v-if="editable" class="text-right">
                                    <Button type="button" variant="ghost" size="icon-sm" :aria-label="`Eliminar la relación de ${subjectName(requirement.requirement_id)} con ${subjectName(requirement.subject_id)}`" @click="remove(requirement)">
                                        <Trash2 aria-hidden="true" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <DialogFooter><DialogClose as-child><Button type="button" variant="outline">Cerrar</Button></DialogClose></DialogFooter>
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</template>
