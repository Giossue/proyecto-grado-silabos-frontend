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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { choosableTypes, isFixedPart } from '@/lib/templateParts';
import { toast } from '@/lib/toast';
import { useApiForm as useForm } from '@/lib/apiVisit';
import type {
    TemplateContentType,
    TemplateFieldContainer,
} from '@/types/configuration';

type EditableContentType = Exclude<
    TemplateContentType,
    'institutional'
>;

const props = defineProps<{
    templateId: string;
    sectionTitle: string;
    field: TemplateFieldContainer;
    blockTypes: { value: EditableContentType; label: string }[];
}>();

const primary = computed(() => props.field.fields[0] ?? null);
const fixed = computed(() => isFixedPart(props.field));
const editOpen = ref(false);
const deleteOpen = ref(false);
const form = useForm({
    block_id: props.field.id,
    key: '',
    label: '',
    content_type: 'text' as TemplateContentType,
    help: '',
    ai_enabled: false,
    landscape: false,
    document: null as TemplateFieldContainer['document'],
    fingerprint: '',
});

const title = computed(() => props.field.title);
const typeOptions = computed(() => choosableTypes(props.blockTypes));
const typeCanChange = computed(
    () => !fixed.value && !props.field.document && !primary.value?.inherited,
);
const dialogTitle = computed(() =>
    fixed.value ? 'Editar texto fijo' : 'Editar parte',
);

const openEdit = (): void => {
    const value = primary.value;

    form.clearErrors();
    form.block_id = props.field.id;
    form.document = props.field.document ?? null;
    form.fingerprint = props.field.fingerprint ?? '';
    form.label = props.field.title;
    form.landscape = props.field.page_orientation === 'landscape';

    if (!value) {
        // Texto fijo: sin preguntas al docente, solo se renombra.
        form.content_type = props.field.content_type;
        editOpen.value = true;

        return;
    }

    form.key = value.key;
    form.content_type = value.content_type;
    form.help = value.help ?? '';
    form.ai_enabled = Boolean(value.ai_enabled);
    editOpen.value = true;
};

const save = (): void => {
    const value = primary.value;

    if (form.label.trim() === '') {
        form.errors = { label: 'Escriba un nombre.' };

        return;
    }

    if (!value && !props.field.document) {
        toast.error(
            'No se pudo guardar: esta parte no tiene contenido. Recargue la página e intente de nuevo.',
        );

        return;
    }

    const url = props.field.document
        ? TemplateController.updateDocument.url({
              template: props.templateId,
              block: props.field.id,
          })
        : TemplateController.updateField.url({
              template: props.templateId,
              field: value!.id,
          });
    const orientation = fixed.value
        ? {}
        : pageOrientationPayload(form.landscape);

    form.transform((data) => {
        const rest: Record<string, unknown> = { ...data };
        delete rest.landscape;

        if (!props.field.document) {
            return { ...rest, ...orientation };
        }

        // Una parte con documento guarda sus propiedades junto con el documento.
        return {
            ...rest,
            ...orientation,
            title: data.label,
            properties: value
                ? [
                      {
                          key: data.key,
                          label: data.label,
                          help: data.help,
                          ai_enabled: data.ai_enabled,
                      },
                  ]
                : [],
        };
    });

    form.patch(url, {
        preserveScroll: true,
        onSuccess: () => {
            toast.success(fixed.value ? 'Texto fijo guardado.' : 'Parte guardada.');
            editOpen.value = false;
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(
                    Object.values(errors)[0] ??
                        'No se pudo guardar la parte.',
                );
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
                            {{ dialogTitle }}
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
                <DialogTitle>{{ dialogTitle }}</DialogTitle>
                <DialogDescription>
                    {{
                        fixed
                            ? 'Cambie el nombre de este texto fijo. El docente no lo llena.'
                            : 'Ajuste el nombre y cómo lo completará el docente.'
                    }}
                </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-4" @submit.prevent="save">
                <FieldGroup>
                    <Field :data-invalid="Boolean(form.errors.label)">
                        <FieldLabel for="edit-template-field-label" required>
                            Nombre
                        </FieldLabel>
                        <Input
                            id="edit-template-field-label"
                            v-model="form.label"
                            maxlength="180"
                            placeholder="Ej. Objetivo general"
                            :disabled="form.processing"
                            :aria-invalid="Boolean(form.errors.label)"
                        />
                        <FieldError
                            v-if="form.errors.label"
                            :errors="[form.errors.label]"
                        />
                    </Field>

                    <Field
                        v-if="typeCanChange"
                        :data-invalid="Boolean(form.errors.content_type)"
                    >
                        <FieldLabel
                            for="edit-template-field-content-type"
                            required
                        >
                            Tipo de parte
                        </FieldLabel>
                        <Select
                            v-model="form.content_type"
                            :disabled="form.processing"
                        >
                            <SelectTrigger
                                id="edit-template-field-content-type"
                                class="w-full"
                                :aria-invalid="
                                    Boolean(form.errors.content_type)
                                "
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem
                                        v-for="type in typeOptions"
                                        :key="type.value"
                                        :value="type.value"
                                    >
                                        {{ type.label }}
                                    </SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <FieldError
                            v-if="form.errors.content_type"
                            :errors="[form.errors.content_type]"
                        />
                    </Field>
                    <Field v-if="!fixed" orientation="horizontal">
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
                    <Field v-if="primary && !fixed" orientation="horizontal">
                        <Checkbox
                            id="edit-template-field-ai-enabled"
                            v-model="form.ai_enabled"
                            :disabled="form.processing"
                        />
                        <FieldContent>
                            <FieldLabel for="edit-template-field-ai-enabled">
                                Permitir que la IA lea esta parte
                            </FieldLabel>
                            <FieldDescription>
                                La IA lo usará como referencia para sus
                                sugerencias; el docente decide si las aplica.
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
                        <Spinner
                            v-if="form.processing"
                            data-icon="inline-start"
                        />
                        <Save
                            v-else
                            data-icon="inline-start"
                            aria-hidden="true"
                        />
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
                    Se quitará «{{ title }}» de «{{ sectionTitle }}». Los
                    sílabos entregados conservan su copia.
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
