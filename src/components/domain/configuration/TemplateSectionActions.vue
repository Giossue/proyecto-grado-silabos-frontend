<script setup lang="ts">
import { MoreHorizontal, Pencil, Save, Trash2 } from '@lucide/vue';
import { ref } from 'vue';
import TemplateController from '@/api/template-routes';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/lib/toast';
import { useApiForm as useForm } from '@/lib/apiVisit';
import type { TemplateSection } from '@/types/configuration';

const props = defineProps<{
    templateId: string;
    section: TemplateSection;
}>();

const editOpen = ref(false);
const deleteOpen = ref(false);
const form = useForm({ title: props.section.title });

const openEdit = (): void => {
    form.clearErrors();
    form.title = props.section.title;
    editOpen.value = true;
};

const save = (): void => {
    form.patch(
        TemplateController.updateSection.url({
            template: props.templateId,
            section: props.section.id,
        }),
        {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Sección actualizada.');
                editOpen.value = false;
            },
            onError: (errors) => {
                if (!('purge_required' in errors)) {
                    toast.error(
                        Object.values(errors)[0] ??
                            'No se pudo actualizar la sección.',
                    );
                }
            },
        },
    );
};

const destroy = (): void => {
    form.delete(
        TemplateController.destroySection.url({
            template: props.templateId,
            section: props.section.id,
        }),
        {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Sección eliminada.');
                deleteOpen.value = false;
            },
            onError: (errors) => {
                if (!('purge_required' in errors)) {
                    toast.error(
                        Object.values(errors)[0] ??
                            'No se pudo eliminar la sección.',
                    );
                }
            },
        },
    );
};

defineExpose({
    openEdit,
    openDelete: () => {
        deleteOpen.value = true;
    },
});
</script>

<template>
    <Tooltip :disable-hoverable-content="true">
        <TooltipTrigger as-child>
            <span class="inline-flex">
                <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            class="size-7 text-foreground"
                            :aria-label="`Acciones de la sección ${section.title}`"
                        >
                            <MoreHorizontal aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem @select="openEdit">
                            <Pencil aria-hidden="true" />
                            Renombrar sección
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            @select="deleteOpen = true"
                        >
                            <Trash2 aria-hidden="true" />
                            Eliminar sección
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </span>
        </TooltipTrigger>
        <TooltipContent paper side="left" :side-offset="8">
            Acciones de la sección
        </TooltipContent>
    </Tooltip>

    <Dialog v-model:open="editOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Renombrar sección</DialogTitle>
                <DialogDescription>
                    Cambie el nombre de esta sección.
                </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-4" @submit.prevent="save">
                <FieldGroup>
                    <Field :data-invalid="Boolean(form.errors.title)">
                        <FieldLabel for="edit-template-section-title" required>
                            Nombre de la sección
                        </FieldLabel>
                        <Input
                            id="edit-template-section-title"
                            v-model="form.title"
                            maxlength="180"
                            placeholder="Ej. Objetivos de la asignatura"
                            :disabled="form.processing"
                            :aria-invalid="Boolean(form.errors.title)"
                        />
                        <FieldError
                            v-if="form.errors.title"
                            :errors="[form.errors.title]"
                        />
                    </Field>
                </FieldGroup>
                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        :disabled="form.processing"
                        @click="editOpen = false"
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" :disabled="form.processing">
                        <Spinner
                            v-if="form.processing"
                            data-icon="inline-start"
                        />
                        <Save
                            v-else
                            data-icon="inline-start"
                            aria-hidden="true"
                        />
                        Guardar nombre
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Eliminar sección</DialogTitle>
                <DialogDescription>
                    Se quitará «{{ section.title }}» con sus
                    {{ section.blocks.length }} partes. Los sílabos entregados
                    conservan su copia.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    :disabled="form.processing"
                    @click="deleteOpen = false"
                >
                    Cancelar
                </Button>
                <Button
                    type="button"
                    variant="destructive"
                    :disabled="form.processing"
                    @click="destroy"
                >
                    <Spinner v-if="form.processing" data-icon="inline-start" />
                    <Trash2
                        v-else
                        data-icon="inline-start"
                        aria-hidden="true"
                    />
                    Eliminar sección
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
