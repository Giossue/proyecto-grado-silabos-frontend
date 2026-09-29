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
import { isFixedPart, partFormLabel } from '@/lib/templateParts';
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
    /** Sección de la parte: «Mostrar solo si» se limita a preguntas de la misma sección. */
    sectionId?: string;
    field: TemplateFieldContainer;
    blockTypes: { value: EditableContentType; label: string }[];
    variables?: TemplateVariable[];
    /** Partes Sí/No o de selección de la plantilla, para «Mostrar solo si». */
    choiceFields?: {
        key: string;
        label: string;
        sectionId?: string;
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
// Solo las preguntas que ya toman opciones de listas curriculares; un Sí/No no las usa (I-155).
const optionParts = computed(() => props.field.fields.filter((part) => part.type === 'seleccion_multiple' || documentOptionsSources(part).length > 0));
const targetOptions = (key: string) =>
    (props.choiceFields ?? []).find((item) => item.key === key)?.options ?? [];
/**
 * «Si en <pregunta> responden <valor>, pedir también…»: la condición se configura desde
 * la pregunta, como la piensa Administración. Se guarda igual que antes, en cada parte
 * dependiente (`mostrar_si`). Solo participan preguntas de la misma sección.
 */
const triggers = computed(() =>
    (props.choiceFields ?? []).filter(
        (item) =>
            item.options.length > 0 &&
            (item.sectionId === props.sectionId ||
                conditionParts.value.some((part) => conditions.value[part.key]?.key === item.key)),
    ),
);
const triggerValues = ref<Record<string, string>>({});
const dependents = (trigger: string) =>
    conditionParts.value.filter((part) => part.key !== trigger);
const dependsOn = (part: string, trigger: string): boolean =>
    conditions.value[part]?.key === trigger;
const toggleDependent = (part: string, trigger: string, checked: boolean | 'indeterminate'): void => {
    conditions.value[part] = checked === true
        ? { key: trigger, value: triggerValues.value[trigger] ?? targetOptions(trigger)[0]?.value ?? '' }
        : { key: ALWAYS, value: '' };
};
const chooseTriggerValue = (trigger: string, value: unknown): void => {
    if (typeof value !== 'string') return;
    triggerValues.value[trigger] = value;
    for (const part of conditionParts.value) {
        if (dependsOn(part.key, trigger)) conditions.value[part.key] = { key: trigger, value };
    }
};
// Nombres de las preguntas internas de una parte con varias (p. ej., la ficha de identificación).
const partLabels = ref<Record<string, string>>({});
const showWhen = (key: string): ShowWhen => {
    const condition = conditions.value[key];

    return condition && condition.key !== ALWAYS && condition.value !== ''
        ? { key: condition.key, value: condition.value }
        : null;
};

const primary = computed(() => props.field.fields[0] ?? null);
const fixed = computed(() => isFixedPart(props.field));
// La ficha de identificación no usa listas curriculares ni cambia de orientación.
const institutional = computed(() => props.field.content_type === 'institutional');
const multiPart = computed(() => Boolean(props.field.document) && conditionParts.value.length > 1);
const conditionRules = computed(() =>
    fixed.value ? [] : triggers.value.filter((trigger) => dependents(trigger.key).length > 0),
);
const editOpen = ref(false);
const deleteOpen = ref(false);
const form = useForm({
    block_id: props.field.id,
    key: '',
    label: '',
    content_type: 'text' as TemplateContentType,
    help: '',
    landscape: false,
    document: null as TemplateFieldContainer['document'],
    fingerprint: '',
    options_sources: [] as string[],
});

const title = computed(() => props.field.title.trim() || 'sin nombre');
const dialogTitle = computed(() =>
    'Propiedades de la parte',
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
    partLabels.value = Object.fromEntries(conditionParts.value.map((part) => [part.key, part.label]));
    // Cada pregunta abre con la respuesta que ya usan sus dependientes, o con la primera.
    triggerValues.value = Object.fromEntries(
        (props.choiceFields ?? []).map((item) => [
            item.key,
            conditionParts.value.find((part) => part.show_when?.key === item.key)?.show_when?.value
                ?? item.options[0]?.value ?? '',
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
        const properties: Record<string, unknown>[] = multiPart.value
            ? conditionParts.value.map((part) => ({
                  key: part.key,
                  label: partLabels.value[part.key] ?? part.label,
                  help: part.help ?? '',
                  show_when: showWhen(part.key),
              }))
            : value
            ? [
                  {
                      key: data.key,
                      label: data.label,
                      help: data.help,
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
                            : 'Ajuste el nombre y las opciones de la parte.'
                    }}
                </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-6" @submit.prevent="save">
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

                    <!-- La forma se elige al crear la parte y no cambia (I-155). -->
                    <p v-if="!institutional" class="text-sm text-muted-foreground">
                        Forma: <span class="font-medium text-foreground">{{ partFormLabel(field) }}</span>.
                        Para usar otra forma, elimine la parte y cree una nueva.
                    </p>
                    <template v-if="!institutional">
                        <template v-if="field.document">
                            <CurricularOptionsSourceSelect v-for="part in optionParts" :key="part.key" :id="`edit-options-source-${part.key}`" :label="`Listas para ${part.label}`" v-model="optionSources[part.key]" :variables="variables" :disabled="form.processing" :manual="part.type === 'seleccion_unica'" />
                        </template>
                        <CurricularOptionsSourceSelect v-else-if="form.content_type === 'multiple_choice' || optionParts.length" id="edit-options-source" v-model="form.options_sources" :variables="variables" :disabled="form.processing" :manual="form.content_type !== 'multiple_choice' && primary?.type === 'seleccion_unica'" />
                        <FieldError :errors="Object.entries(form.errors).filter(([key]) => key.includes('options_source')).map(([, value]) => value)" />
                    </template>
                    <Field v-if="!fixed && !institutional" orientation="horizontal">
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

                <FieldSet v-if="multiPart && !fixed" class="gap-3">
                    <FieldLegend>Preguntas que llena el docente</FieldLegend>
                    <FieldDescription>Así se llaman en el sílabo. Puede cambiar su nombre.</FieldDescription>
                    <Field v-for="(part, index) in conditionParts" :key="part.key">
                        <FieldLabel :for="`edit-part-label-${part.key}`" class="sr-only">Nombre de la pregunta {{ index + 1 }}</FieldLabel>
                        <Input :id="`edit-part-label-${part.key}`" v-model="partLabels[part.key]" maxlength="180" placeholder="Ej. Formación y experiencia" :disabled="form.processing" />
                    </Field>
                </FieldSet>

                <FieldSet v-if="conditionRules.length" class="gap-3">
                    <FieldLegend>Preguntas que dependen de una respuesta</FieldLegend>
                    <FieldDescription>Lo que marque se pide solo con esa respuesta. Lo demás se pide siempre.</FieldDescription>
                    <div
                        v-for="trigger in conditionRules"
                        :key="trigger.key"
                        class="flex flex-col gap-3 rounded-md border p-3"
                        :data-trigger="trigger.key"
                    >
                        <Field class="sm:grid sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center sm:gap-3">
                            <FieldLabel :for="`trigger-value-${trigger.key}`" class="break-words font-normal">
                                Si en «{{ trigger.label }}» responden
                            </FieldLabel>
                            <Select
                                :model-value="triggerValues[trigger.key]"
                                :disabled="form.processing"
                                @update:model-value="chooseTriggerValue(trigger.key, $event)"
                            >
                                <SelectTrigger :id="`trigger-value-${trigger.key}`" class="w-full">
                                    <SelectValue placeholder="Elija un valor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem v-for="option in trigger.options" :key="option.value" :value="option.value">
                                            {{ option.label }}
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </Field>
                        <FieldSet class="gap-2">
                            <FieldLegend variant="label">pedir también:</FieldLegend>
                            <Field
                                v-for="part in dependents(trigger.key)"
                                :key="part.key"
                                orientation="horizontal"
                                :data-condition="part.key"
                            >
                                <Checkbox
                                    :id="`depends-${trigger.key}-${part.key}`"
                                    :model-value="dependsOn(part.key, trigger.key)"
                                    :disabled="form.processing"
                                    @update:model-value="toggleDependent(part.key, trigger.key, $event)"
                                />
                                <FieldLabel :for="`depends-${trigger.key}-${part.key}`" class="font-normal">
                                    {{ (partLabels[part.key] ?? part.label).trim() || title }}
                                </FieldLabel>
                            </Field>
                        </FieldSet>
                    </div>
                </FieldSet>
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
