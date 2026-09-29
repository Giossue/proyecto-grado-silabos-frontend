<script setup lang="ts">
import { Link2, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import { ApiError } from '@/api/client';
import {
    createSubjectRequirement,
    deleteSubjectRequirement,
} from '@/api/career-academics';
import type { CurriculumRequirement } from '@/components/domain/academic/curriculum/curriculumCanvasLayout';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';

const props = defineProps<{
    curriculumId: string;
    editable: boolean;
    subjectName: (id: string | null | undefined) => string;
}>();
const emit = defineEmits<{ changed: [message: string] }>();

const pendingConnection = defineModel<{
    sourceId: string;
    targetId: string;
} | null>('pendingConnection', { required: true });
const selectedRequirement = defineModel<CurriculumRequirement | null>(
    'selectedRequirement',
    { required: true },
);
const savingRequirement = ref(false);
const deletingRequirement = ref(false);

const createRequirement = async (type: 'prerrequisito' | 'correquisito'): Promise<void> => {
    const pending = pendingConnection.value;

    if (!props.editable || !pending) {
        return;
    }

    savingRequirement.value = true;
    try {
        const result = await createSubjectRequirement(props.curriculumId, {
            requirement_id: pending.sourceId,
            subject_id: pending.targetId,
            type,
        });
        toast.success(type === 'correquisito' ? 'Correquisito agregado.' : 'Prerrequisito agregado.');
        emit('changed', result.message);
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo crear la relación.');
    } finally {
        savingRequirement.value = false;
        pendingConnection.value = null;
    }
};

const deleteRequirement = async (): Promise<void> => {
    const requirement = selectedRequirement.value;

    if (!props.editable || !requirement) {
        return;
    }

    deletingRequirement.value = true;
    try {
        const result = await deleteSubjectRequirement(props.curriculumId, requirement.id);
        toast.success('Relación académica eliminada.');
        emit('changed', result.message);
    } catch (reason) {
        toast.error(reason instanceof ApiError ? reason.message : 'No se pudo eliminar la relación.');
    } finally {
        deletingRequirement.value = false;
        selectedRequirement.value = null;
    }
};
</script>

<template>
    <Dialog
        :open="pendingConnection !== null"
        @update:open="
            (isOpen) => {
                if (!isOpen) pendingConnection = null;
            }
        "
    >
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Nueva relación académica</DialogTitle>
                <DialogDescription>
                    «{{ subjectName(pendingConnection?.sourceId) }}» →
                    «{{ subjectName(pendingConnection?.targetId) }}».
                    Prerrequisito: debe aprobarse antes. Correquisito:
                    se cursan a la vez.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose as-child>
                    <Button
                        type="button"
                        variant="outline"
                        :disabled="savingRequirement"
                    >
                        Cancelar
                    </Button>
                </DialogClose>
                <Button
                    type="button"
                    variant="secondary"
                    :disabled="savingRequirement"
                    @click="createRequirement('correquisito')"
                >
                    Correquisito
                </Button>
                <Button
                    type="button"
                    :disabled="savingRequirement"
                    @click="createRequirement('prerrequisito')"
                >
                    <Link2
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    Prerrequisito
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog
        :open="selectedRequirement !== null"
        @update:open="
            (isOpen) => {
                if (!isOpen) selectedRequirement = null;
            }
        "
    >
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {{
                        selectedRequirement?.type === 'correquisito'
                            ? 'Correquisito'
                            : 'Prerrequisito'
                    }}
                </DialogTitle>
                <DialogDescription>
                    «{{
                        subjectName(
                            selectedRequirement?.requirement_id,
                        )
                    }}» → «{{
                        subjectName(selectedRequirement?.subject_id)
                    }}». Si la relación se creó por error, puede
                    eliminarla; las materias no se modifican.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <DialogClose as-child>
                    <Button
                        type="button"
                        variant="outline"
                        :disabled="deletingRequirement"
                    >
                        Cancelar
                    </Button>
                </DialogClose>
                <Button
                    type="button"
                    variant="destructive"
                    :disabled="deletingRequirement"
                    @click="deleteRequirement"
                >
                    <Spinner
                        v-if="deletingRequirement"
                        data-icon="inline-start"
                    />
                    <Trash2
                        v-else
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    Eliminar relación
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
