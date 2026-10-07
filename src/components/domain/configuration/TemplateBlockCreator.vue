<script setup lang="ts">
import { VALIDATION_LIMITS } from '@/lib/validationLimits';
import { ArrowLeft, Blocks, ChevronRight, FilePlus2, LibraryBig, Search, Trash2 } from '@lucide/vue';
import { computed, ref } from 'vue';
import TemplateController from '@/api/template-routes';
import TemplatePartFormSelect from '@/components/domain/configuration/TemplatePartFormSelect.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/lib/toast';
import { useApiForm as useForm } from '@/lib/apiVisit';
import type { PartForm, TemplatePreset } from '@/types/configuration';

const props = withDefaults(
    defineProps<{
        templateId: string;
        position: number;
        blockTypes: { value: PartForm; label: string }[];
        presets?: TemplatePreset[];
        empty?: boolean;
        choice?: boolean;
    }>(),
    {
        empty: false,
        choice: false,
        presets: () => [],
    },
);


let sequence = 0;
const technicalKey = (prefix: string): string => {
    sequence += 1;

    return `${prefix}_${Date.now().toString(36)}_${sequence}`;
};

const newField = () => ({
    key: technicalKey('campo'),
    label: '',
    content_type: 'free_text',
});

const open = ref(false);
const emit = defineEmits<{ closed: [] }>();
const form = useForm({
    title: '',
    key: technicalKey('bloque'),
    position: props.position + 1,
    fields: [newField()],
    preset: '',
});

const step = ref<'start' | 'catalog' | 'details'>('start');
const view = computed(() => (props.presets.length === 0 ? 'details' : step.value));
const search = ref('');
const chosen = computed(() => props.presets.find((preset) => preset.key === form.preset) ?? null);
const matches = computed(() => {
    const term = search.value.trim().toLowerCase();

    return props.presets.filter((preset) => term === '' || preset.title.toLowerCase().includes(term));
});

const startBlank = (): void => {
    form.preset = '';
    step.value = 'details';
};

const pickPreset = (key: string): void => {
    form.preset = key;
    if (chosen.value !== null && form.title.trim() === '') {
        form.title = chosen.value.title;
    }
    step.value = 'details';
};

const back = (): void => {
    if (chosen.value !== null) {
        form.preset = '';
        step.value = 'catalog';

        return;
    }
    step.value = 'start';
};

const reset = (): void => {
    form.clearErrors();
    form.title = '';
    form.key = technicalKey('bloque');
    form.position = props.position + 1;
    form.fields = [newField()];
    form.preset = '';
    step.value = 'start';
    search.value = '';
};

const addField = (): void => {
    if (form.fields.length >= 20) {
        return;
    }

    form.fields.push(newField());
};

const removeField = (index: number): void => {
    if (form.fields.length === 1) {
        return;
    }

    form.fields.splice(index, 1);
};

const errorFor = (path: string): string | undefined =>
    (form.errors as Record<string, string>)[path];

const submit = (): void => {
    const errors: Record<string, string> = {};

    if (form.title.trim() === '') {
        errors.title = 'Escriba el nombre de la sección.';
    }
    if (Object.keys(errors).length > 0) {
        form.errors = errors;

        return;
    }

    form.position = props.position + 1;
    form.transform((data) => (data.preset === ''
        ? { ...data, preset: undefined }
        : { ...data, preset: data.preset, fields: undefined }));
    form.post(TemplateController.storeSection.url(props.templateId), {
        preserveScroll: true,
        onSuccess: () => {
            toast.success('Sección agregada.');
            open.value = false;
            reset();
            emit('closed');
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(
                    Object.values(errors)[0] ?? 'No se pudo agregar la sección.',
                );
            }
        },
    });
};

const updateOpen = (value: boolean): void => {
    open.value = value;

    if (!value && !form.processing) {
        reset();
        emit('closed');
    }
};
</script>

<template>
    <Dialog :open="open" @update:open="updateOpen">
        <DialogTrigger as-child>
            <Button
                type="button"
                :variant="empty ? 'default' : choice ? 'ghost' : 'outline'"
                size="sm"
                :class="choice ? 'w-full justify-start' : undefined"
            >
                <Blocks data-icon="inline-start" aria-hidden="true" />
                {{ empty ? 'Agregar primera sección' : 'Agregar sección' }}
            </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Nueva sección</DialogTitle>
                <DialogDescription>
                    La sección es un título numerado del sílabo. Dentro van sus campos.
                </DialogDescription>
            </DialogHeader>
            <form class="flex flex-col gap-6" @submit.prevent="submit">
                <div>
                    <FieldGroup>
                        <div v-if="view === 'start'" class="grid gap-3 sm:grid-cols-2">
                            <Button
                                type="button"
                                variant="outline"
                                class="h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left"
                                @click="startBlank"
                            >
                                <FilePlus2 class="size-6 text-muted-foreground" aria-hidden="true" />
                                <span class="text-sm font-medium">Empezar en blanco</span>
                                <span class="text-xs font-normal text-muted-foreground">Usted arma los campos.</span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                class="h-auto flex-col items-start gap-2 whitespace-normal p-4 text-left"
                                @click="step = 'catalog'"
                            >
                                <LibraryBig class="size-6 text-muted-foreground" aria-hidden="true" />
                                <span class="text-sm font-medium">Usar un diseño oficial</span>
                                <span class="text-xs font-normal text-muted-foreground">Una sección ya armada.</span>
                            </Button>
                        </div>
                        <div v-else-if="view === 'catalog'" class="flex flex-col gap-3">
                            <Button type="button" variant="ghost" size="sm" class="self-start" @click="step = 'start'">
                                <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                                Volver
                            </Button>
                            <InputGroup>
                                <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                                <InputGroupInput v-model="search" placeholder="Buscar" aria-label="Buscar diseño" />
                            </InputGroup>
                            <ul class="flex max-h-72 flex-col gap-1 overflow-y-auto">
                                <li v-for="preset in matches" :key="preset.key">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        class="h-auto w-full justify-between gap-2 whitespace-normal py-2 text-left"
                                        @click="pickPreset(preset.key)"
                                    >
                                        <span class="text-sm">{{ preset.title }}</span>
                                        <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    </Button>
                                </li>
                                <li v-if="matches.length === 0" class="px-2 py-3 text-sm text-muted-foreground">
                                    Ningún diseño coincide.
                                </li>
                            </ul>
                        </div>
                        <template v-else>
                        <Button
                            v-if="presets.length > 0"
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="self-start"
                            :disabled="form.processing"
                            @click="back"
                        >
                            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
                            {{ chosen ? `Diseño: ${chosen.title}` : 'Volver' }}
                        </Button>
                        <Field :data-invalid="Boolean(errorFor('title'))">
                            <FieldLabel for="new-template-block-title" required>
                                Nombre de la sección
                            </FieldLabel>
                            <Input
                                id="new-template-block-title"
                                v-model="form.title"
                                :maxlength="VALIDATION_LIMITS.shortText"
                                placeholder="Ej. Objetivos de la asignatura"
                                :disabled="form.processing"
                                :aria-invalid="Boolean(errorFor('title'))"
                            />
                            <FieldError
                                v-if="errorFor('title')"
                                :errors="[errorFor('title')]"
                            />
                        </Field>

                        <FieldGroup
                            v-for="(field, index) in chosen ? [] : form.fields"
                            :key="field.key"
                            class="gap-3 rounded-lg border p-3"
                        >
                            <div
                                class="flex items-center justify-between gap-2"
                            >
                                <p class="text-sm font-medium">
                                    Campo {{ index + 1 }}
                                </p>
                                <Button
                                    v-if="form.fields.length > 1"
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    :disabled="form.processing"
                                    :aria-label="`Quitar campo ${index + 1}`"
                                    @click="removeField(index)"
                                >
                                    <Trash2 aria-hidden="true" />
                                </Button>
                            </div>

                            <div class="grid gap-3 sm:grid-cols-2">
                            <Field
                                :data-invalid="
                                    Boolean(errorFor(`fields.${index}.label`))
                                "
                            >
                                <FieldLabel
                                    :for="`new-template-field-${index}`"
                                >
                                    Nombre (opcional)
                                </FieldLabel>
                                <Input
                                    :id="`new-template-field-${index}`"
                                    v-model="field.label"
                                    :maxlength="VALIDATION_LIMITS.shortText"
                                    placeholder="Ej. Objetivo general"
                                    :disabled="form.processing"
                                    :aria-invalid="
                                        Boolean(
                                            errorFor(`fields.${index}.label`),
                                        )
                                    "
                                />
                                <FieldError
                                    v-if="errorFor(`fields.${index}.label`)"
                                    :errors="[
                                        errorFor(`fields.${index}.label`),
                                    ]"
                                />
                            </Field>

                            <TemplatePartFormSelect
                                :id="`new-section-field-${index}-form`"
                                v-model="field.content_type"
                                :forms="blockTypes"
                                :disabled="form.processing"
                                :error="errorFor(`fields.${index}.content_type`)"
                            />
                            </div>
                        </FieldGroup>
                        </template>
                    </FieldGroup>

                    <Button
                        type="button"
                        variant="outline"
                        class="mt-4 w-full"
                        :disabled="form.processing || form.fields.length >= 20"
                        v-if="view === 'details' && !chosen"
                        @click="addField"
                    >
                        Agregar otro campo
                    </Button>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" @click="updateOpen(false)">
                        Cancelar
                    </Button>
                    <Button v-if="view === 'details'" type="submit" :disabled="form.processing">
                        <Spinner v-if="form.processing" data-icon="inline-start" />
                        <Blocks v-else data-icon="inline-start" aria-hidden="true" />
                        Crear sección
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>
