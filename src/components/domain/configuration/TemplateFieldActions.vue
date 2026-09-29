<script setup lang="ts">
import { MoreHorizontal, Pencil, Save, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { pageOrientationPayload } from '@/api/template';
import TemplateController from '@/api/template-routes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    FieldContent,
    FieldDescription,
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
import type { TemplateFieldContainer } from '@/types/configuration';

/**
 * Propiedades de una parte (I-158): solo su nombre y la orientación de la hoja. Lo que
 * llena el docente, sus nombres y sus condiciones se definen en la hoja misma.
 */
const props = defineProps<{
    templateId: string;
    sectionTitle: string;
    field: TemplateFieldContainer;
}>();

const editOpen = ref(false);
const deleteOpen = ref(false);
const form = useForm({ label: '', landscape: false });
const title = computed(() => props.field.title.trim() || 'sin nombre');

const openEdit = (): void => {
    form.clearErrors();
    form.label = props.field.title;
    form.landscape = props.field.page_orientation === 'landscape';
    editOpen.value = true;
};

const save = (): void => {
    const primary = props.field.fields[0];
    // Una parte con hoja guarda nombre y orientación junto con su diseño; una parte
    // anterior sin hoja los guarda en su pregunta.
    if (!props.field.document && !primary) {
        toast.error('Recargue la página e intente de nuevo.');

        return;
    }
    const url = props.field.document
        ? TemplateController.updateDocument.url({ template: props.templateId, block: props.field.id })
        : TemplateController.updateField.url({ template: props.templateId, field: primary!.id });
    form.transform((data) => ({
        ...pageOrientationPayload(data.landscape),
        ...(props.field.document
            ? { document: props.field.document, fingerprint: props.field.fingerprint ?? '', title: data.label }
            : { block_id: props.field.id, key: primary!.key, label: data.label, content_type: props.field.content_type }),
    }));
    form.patch(url, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success('Parte guardada.');
            editOpen.value = false;
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(Object.values(errors)[0] ?? 'No se pudo guardar la parte.');
            }
        },
    });
};

const destroy = (): void => {
    form.delete(
        TemplateController.destroyBlock.url({
            template: props.templateId,
            block: props.field.id,
        }),
        {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Parte eliminada.');
                deleteOpen.value = false;
            },
            onError: (errors) => {
                if (!('purge_required' in errors)) {
                    toast.error(
                        Object.values(errors)[0] ??
                            'No se pudo eliminar la parte.',
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
                            :aria-label="`Acciones de la parte ${title}`"
                        >
                            <MoreHorizontal aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem @select="openEdit">
                            <Pencil aria-hidden="true" />
                            Propiedades de la parte
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            @select="deleteOpen = true"
                        >
                            <Trash2 aria-hidden="true" />
                            Eliminar parte
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </span>
        </TooltipTrigger>
        <TooltipContent paper side="left" :side-offset="8">
            Acciones de la parte
        </TooltipContent>
    </Tooltip>

    <Dialog v-model:open="editOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Propiedades de la parte</DialogTitle>
                <DialogDescription>
                    Lo que llena el docente y cuándo se pide se define en la hoja.
                </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-6" @submit.prevent="save">
                <FieldGroup>
                    <Field :data-invalid="Boolean(form.errors.label ?? form.errors.title)">
                        <FieldLabel for="edit-template-field-label">
                            Nombre (opcional)
                        </FieldLabel>
                        <Input
                            id="edit-template-field-label"
                            v-model="form.label"
                            maxlength="180"
                            placeholder="Ej. Objetivo general"
                            :disabled="form.processing"
                        />
                        <FieldDescription>
                            Si lo deja vacío, la parte no lleva subtítulo.
                        </FieldDescription>
                        <FieldError :errors="[form.errors.label ?? form.errors.title]" />
                    </Field>
                    <Field orientation="horizontal">
                        <Checkbox
                            id="edit-template-field-landscape"
                            v-model="form.landscape"
                            :disabled="form.processing"
                        />
                        <FieldContent>
                            <FieldLabel for="edit-template-field-landscape">
                                Hoja horizontal
                            </FieldLabel>
                            <FieldDescription>
                                Para tablas anchas. La sección de esta parte se
                                imprime en una hoja horizontal.
                            </FieldDescription>
                        </FieldContent>
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
                        <Spinner v-if="form.processing" data-icon="inline-start" />
                        <Save v-else data-icon="inline-start" aria-hidden="true" />
                        Guardar
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>

    <Dialog v-model:open="deleteOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Eliminar parte</DialogTitle>
                <DialogDescription>
                    Se quitará «{{ title }}» de «{{ sectionTitle }}». Si hay
                    sílabos en curso afectados, se pedirá confirmar su
                    regeneración. Los sílabos con una aprobación conservada y
                    los procesos cerrados se mantienen.
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
                    Eliminar parte
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
