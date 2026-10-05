<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
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
import FreeTextEditor from '@/components/domain/syllabus/FreeTextEditor.vue';
import { isFreeTextDocument } from '@/components/domain/syllabus/freeTextRender';
import type { DocumentNode } from '@/lib/templateDocument';
import { toast } from '@/lib/toast';
import { useApiForm as useForm } from '@/lib/apiVisit';
import type { TemplateFieldContainer } from '@/types/configuration';

const props = defineProps<{
    templateId: string;
    sectionTitle: string;
    field: TemplateFieldContainer;
}>();

const editOpen = ref(false);
const deleteOpen = ref(false);
const form = useForm({ label: '', landscape: false });
const profileForm = useForm<{ block_id: string; key: string; label: string; content_type: string; from_profile: boolean; teacher_editable: boolean; initial_content?: DocumentNode | null }>({ block_id: '', key: '', label: '', content_type: 'text', from_profile: false, teacher_editable: false });
const fromProfile = ref(false);
const initialContent = ref<DocumentNode | null>(null);
const initialChanged = ref(false);
/** El contenido inicial (por ejemplo una tabla de planificación) solo aplica a un campo de texto libre que escribe el docente. */
const initialCapable = computed(() => profileCapable.value && !fromProfile.value);
const teacherEditable = ref(false);
/** Solo un campo de texto libre propio puede llenarse desde la ficha de la asignatura. */
const profileCapable = computed(() => {
    const primary = props.field.fields[0];

    return primary !== undefined && primary.type === 'texto_libre' && primary.master_source !== 'asignaturas';
});
const title = computed(() => props.field.title.trim() || 'sin nombre');

const openEdit = (): void => {
    form.clearErrors();
    form.label = props.field.title;
    form.landscape = props.field.page_orientation === 'landscape';
    fromProfile.value = props.field.fields[0]?.master_source === 'ficha';
    initialContent.value = isFreeTextDocument(props.field.fields[0]?.initial_content) ? props.field.fields[0]!.initial_content! : null;
    initialChanged.value = false;
    teacherEditable.value = fromProfile.value && props.field.fields[0]?.teacher_editable === true;
    editOpen.value = true;
};

const save = (): void => {
    const primary = props.field.fields[0];
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
            if (profileCapable.value && (profileChanged() || (initialCapable.value && initialChanged.value))) {
                saveProfileOrigin(primary!.id, data_label(primary!.label));

                return;
            }
            toast.success('Campo guardado.');
            editOpen.value = false;
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(Object.values(errors)[0] ?? 'No se pudo guardar el campo.');
            }
        },
    });
};

const data_label = (current: string): string => form.label.trim() || current;

const profileChanged = (): boolean => {
    const primary = props.field.fields[0];

    return fromProfile.value !== (primary?.master_source === 'ficha')
        || (fromProfile.value && teacherEditable.value !== (primary?.teacher_editable === true));
};

const saveProfileOrigin = (fieldId: string, label: string): void => {
    const primary = props.field.fields[0]!;
    profileForm.block_id = props.field.id;
    profileForm.key = primary.key;
    profileForm.label = label;
    profileForm.content_type = props.field.content_type;
    profileForm.from_profile = fromProfile.value;
    profileForm.teacher_editable = fromProfile.value && teacherEditable.value;
    if (initialCapable.value && initialChanged.value) {
        profileForm.initial_content = initialContent.value;
    } else {
        delete profileForm.initial_content;
    }
    profileForm.patch(TemplateController.updateField.url({ template: props.templateId, field: fieldId }), {
        preserveScroll: true,
        onSuccess: () => {
            toast.success('Campo guardado.');
            editOpen.value = false;
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(Object.values(errors)[0] ?? 'No se pudo guardar el origen del campo.');
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
                toast.success('Campo eliminado.');
                deleteOpen.value = false;
            },
            onError: (errors) => {
                if (!('purge_required' in errors)) {
                    toast.error(
                        Object.values(errors)[0] ??
                            'No se pudo eliminar el campo.',
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
                            :aria-label="`Acciones del campo ${title}`"
                        >
                            <MoreHorizontal aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem @select="openEdit">
                            <Pencil aria-hidden="true" />
                            Propiedades del campo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            @select="deleteOpen = true"
                        >
                            <Trash2 aria-hidden="true" />
                            Eliminar campo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </span>
        </TooltipTrigger>
        <TooltipContent paper side="left" :side-offset="8">
            Acciones del campo
        </TooltipContent>
    </Tooltip>

    <Dialog v-model:open="editOpen">
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Propiedades del campo</DialogTitle>
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
                            :maxlength="VALIDATION_LIMITS.shortText"
                            placeholder="Ej. Objetivo general"
                            :disabled="form.processing"
                        />
                        <FieldDescription>
                            Si lo deja vacío, el campo no lleva subtítulo.
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
                                Para tablas anchas. La sección de este campo se
                                imprime en una hoja horizontal.
                            </FieldDescription>
                        </FieldContent>
                    </Field>
                    <Field v-if="profileCapable" orientation="horizontal">
                        <Checkbox
                            id="edit-template-field-profile"
                            v-model="fromProfile"
                            :disabled="form.processing || profileForm.processing"
                        />
                        <FieldContent>
                            <FieldLabel for="edit-template-field-profile">
                                Se llena desde la ficha de la asignatura
                            </FieldLabel>
                            <FieldDescription>
                                Coordinación lo escribe una vez por materia y
                                cada sílabo nuevo lo hereda.
                            </FieldDescription>
                        </FieldContent>
                    </Field>
                    <Field v-if="profileCapable && fromProfile" orientation="horizontal">
                        <Checkbox
                            id="edit-template-field-adjust"
                            v-model="teacherEditable"
                            :disabled="form.processing || profileForm.processing"
                        />
                        <FieldContent>
                            <FieldLabel for="edit-template-field-adjust">
                                El docente puede ajustarlo
                            </FieldLabel>
                            <FieldDescription>
                                Llega como sugerencia: el docente puede
                                agregar o quitar texto en su sílabo.
                            </FieldDescription>
                        </FieldContent>
                    </Field>
                    <Field v-if="initialCapable">
                        <FieldLabel for="edit-template-field-initial">
                            Contenido inicial (opcional)
                        </FieldLabel>
                        <FreeTextEditor
                            id="edit-template-field-initial"
                            label="Contenido inicial"
                            :model-value="initialContent"
                            :disabled="form.processing || profileForm.processing"
                            @update:model-value="initialContent = $event; initialChanged = true"
                        />
                        <FieldDescription>
                            Lo que cada sílabo nuevo trae escrito en este campo, por ejemplo una tabla para que el docente la llene.
                        </FieldDescription>
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
                <DialogTitle>Eliminar campo</DialogTitle>
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
                    Eliminar campo
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
