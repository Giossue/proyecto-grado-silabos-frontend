<script setup lang="ts">
import { MoreHorizontal, Pencil, Save, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import { pageOrientationPayload } from '@/api/template';
import CurricularOptionsSourceSelect from '@/components/domain/configuration/CurricularOptionsSourceSelect.vue';
import { documentOptionsSources, type TemplateVariable } from '@/lib/templateDocument';
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
    FieldLegend,
    FieldSet,
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
import type { ShowWhen } from '@/lib/fieldConditions';
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
    variables?: TemplateVariable[];
    /** Partes Sí/No o de selección de la plantilla, para «Mostrar solo si». */
    choiceFields?: {
        key: string;
        label: string;
        options: { value: string; label: string }[];
    }[];
}>();

const ALWAYS = '__siempre__';
/** Partes que llena el docente: cada una puede tener su «Mostrar solo si». */
const conditionParts = computed(() =>
    props.field.fields.filter(
        (item) => !item.inherited && item.teacher_editable !== false,
    ),
);
const conditions = ref<Record<string, { key: string; value: string }>>({});
const optionSources = ref<Record<string, string[]>>({});
const optionParts = computed(() => props.field.fields.filter((part) => ['seleccion_unica', 'seleccion_multiple'].includes(part.type ?? '')));
const conditionTargets = (ownKey: string) =>
    (props.choiceFields ?? []).filter((item) => item.key !== ownKey);
const targetOptions = (key: string) =>
    (props.choiceFields ?? []).find((item) => item.key === key)?.options ?? [];
const chooseTarget = (ownKey: string, key: string): void => {
    conditions.value[ownKey] = {
        key,
        value: key === ALWAYS ? '' : (targetOptions(key)[0]?.value ?? ''),
    };
};
const showWhen = (key: string): ShowWhen => {
    const condition = conditions.value[key];

    return condition && condition.key !== ALWAYS && condition.value !== ''
        ? { key: condition.key, value: condition.value }
        : null;
};

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
    options_sources: [] as string[],
});

const title = computed(() => props.field.title.trim() || 'sin nombre');
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
    optionSources.value = Object.fromEntries(optionParts.value.map((part) => [part.key, documentOptionsSources(part)]));
    form.options_sources = value ? documentOptionsSources(value) : [];
    conditions.value = Object.fromEntries(
        conditionParts.value.map((part) => [
            part.key,
            {
                key: part.show_when?.key ?? ALWAYS,
                value: part.show_when?.value ?? '',
            },
        ]),
    );

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
    const missingList = props.field.document
        ? optionParts.value.some((part) => part.type === 'seleccion_multiple' && !optionSources.value[part.key]?.length)
        : form.content_type === 'multiple_choice' && !form.options_sources.length;
    if (missingList) {
        form.errors = { options_sources: 'Seleccione al menos una lista curricular para cada pregunta de selección múltiple.' };
        return;
    }

    if (!value && !props.field.document) {
        toast.error(
            'Escriba el texto fijo antes de guardar. Recargue la página e intente de nuevo.',
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
            const condition =
                value && conditionParts.value.some((part) => part.key === value.key)
                    ? { show_when: showWhen(value.key) }
                    : {};

            return { ...rest, ...orientation, ...condition };
        }

        // Una parte con documento guarda sus propiedades junto con el documento;
        // las demás partes del docente solo agregan su «Mostrar solo si».
        const properties: Record<string, unknown>[] = value
            ? [
                  {
                      key: data.key,
                      label: data.label,
                      help: data.help,
                      ai_enabled: data.ai_enabled,
                  },
              ]
            : [];
        for (const part of conditionParts.value) {
            const existing = properties.find((item) => item.key === part.key);
            if (existing) {
                existing.show_when = showWhen(part.key);
            } else {
                properties.push({
                    key: part.key,
                    label: part.label,
                    help: part.help ?? '',
                    show_when: showWhen(part.key),
                });
            }
        }
        for (const part of optionParts.value) {
            const existing = properties.find((item) => item.key === part.key);
            if (existing) existing.options_sources = optionSources.value[part.key] ?? [];
        }

        return {
            ...rest,
            ...orientation,
            title: data.label,
            properties,
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
                <template v-if="field.document">
                    <CurricularOptionsSourceSelect v-for="part in optionParts" :key="part.key" :id="`edit-options-source-${part.key}`" :label="`Listas para ${part.label}`" v-model="optionSources[part.key]" :variables="variables" :disabled="form.processing" :manual="part.type === 'seleccion_unica'" />
                </template>
                <CurricularOptionsSourceSelect v-else-if="form.content_type === 'multiple_choice' || optionParts.length" id="edit-options-source" v-model="form.options_sources" :variables="variables" :disabled="form.processing" :manual="form.content_type !== 'multiple_choice' && primary?.type === 'seleccion_unica'" />
                <FieldError :errors="Object.entries(form.errors).filter(([key]) => key.includes('options_source')).map(([, value]) => value)" />
                <FieldGroup>
                    <Field :data-invalid="Boolean(form.errors.label)">
                        <FieldLabel for="edit-template-field-label">
                            Nombre (opcional)
                        </FieldLabel>
                        <Input
                            id="edit-template-field-label"
                            v-model="form.label"
                            maxlength="180"
                            placeholder="Ej. Objetivo general"
                            :disabled="form.processing"
                            :aria-invalid="Boolean(form.errors.label)"
                        />
                        <FieldDescription>
                            Si lo deja vacío, la parte no lleva subtítulo.
                        </FieldDescription>
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
                    <FieldSet
                        v-for="part in fixed ? [] : conditionParts"
                        :key="part.key"
                        class="gap-3"
                        :data-condition="part.key"
                    >
                        <FieldLegend variant="label">
                            Mostrar
                            {{
                                conditionParts.length > 1
                                    ? `«${part.label.trim() || title}»`
                                    : 'esta parte'
                            }}
                        </FieldLegend>
                        <FieldDescription>
                            Elija «Siempre» o que aparezca solo cuando otra
                            parte tenga cierta respuesta.
                        </FieldDescription>
                        <div class="grid gap-2 sm:grid-cols-2">
                            <Field>
                                <FieldLabel :for="`condition-part-${part.key}`">
                                    Mostrar solo si
                                </FieldLabel>
                                <Select
                                    :model-value="conditions[part.key]?.key ?? ALWAYS"
                                    :disabled="form.processing"
                                    @update:model-value="
                                        chooseTarget(part.key, String($event))
                                    "
                                >
                                    <SelectTrigger
                                        :id="`condition-part-${part.key}`"
                                        class="w-full"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem :value="ALWAYS">
                                                Siempre
                                            </SelectItem>
                                            <SelectItem
                                                v-for="target in conditionTargets(part.key)"
                                                :key="target.key"
                                                :value="target.key"
                                            >
                                                {{ target.label }}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                v-if="
                                    conditions[part.key] &&
                                    conditions[part.key].key !== ALWAYS
                                "
                            >
                                <FieldLabel :for="`condition-value-${part.key}`">
                                    es igual a
                                </FieldLabel>
                                <Select
                                    v-model="conditions[part.key].value"
                                    :disabled="form.processing"
                                >
                                    <SelectTrigger
                                        :id="`condition-value-${part.key}`"
                                        class="w-full"
                                    >
                                        <SelectValue placeholder="Elija un valor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem
                                                v-for="option in targetOptions(
                                                    conditions[part.key].key,
                                                )"
                                                :key="option.value"
                                                :value="option.value"
                                            >
                                                {{ option.label }}
                                            </SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </FieldSet>
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
