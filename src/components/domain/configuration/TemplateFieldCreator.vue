<script setup lang="ts">
import { ListPlus } from '@lucide/vue';
import { ref } from 'vue';
import TemplateController from '@/api/template-routes';
import TemplatePartKindPicker from '@/components/domain/configuration/TemplatePartKindPicker.vue';
import type { TemplateVariable } from '@/lib/templateDocument';
import FormSheet from '@/components/domain/FormSheet.vue';
import FormSheetActions from '@/components/domain/FormSheetActions.vue';
import { Button } from '@/components/ui/button';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { emptyPartChoice, partChoiceErrors, partChoicePayload } from '@/lib/templateParts';
import { toast } from '@/lib/toast';
import { useApiForm as useForm } from '@/lib/apiVisit';
import type { TemplateContentType } from '@/types/configuration';

type EditableContentType = Exclude<
    TemplateContentType,
    'institutional'
>;

const props = withDefaults(
    defineProps<{
        templateId: string;
        sectionId: string;
        position: number;
        blockTypes: { value: EditableContentType; label: string }[];
        choice?: boolean;
        variables?: TemplateVariable[];
    }>(),
    { choice: false },
);

// El texto fijo es una respuesta más de «¿Quién llena esta parte?» (I-154).
const texts = {
    action: 'Agregar parte',
    title: 'Nueva parte',
    description: 'Se añadirá dentro de esta sección.',
    done: 'Parte agregada.',
};

const open = ref(false);
const emit = defineEmits<{ closed: [] }>();
const form = useForm({
    section_id: props.sectionId,
    position: props.position + 1,
    key: '',
    label: '',
    ...emptyPartChoice(),
});

const keyFor = (): string =>
    `campo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const reset = (): void => {
    form.clearErrors();
    form.section_id = props.sectionId;
    form.position = props.position + 1;
    form.key = keyFor();
    form.label = '';
    Object.assign(form, emptyPartChoice());
};

reset();

const errorFor = (path: string): string | undefined =>
    (form.errors as Record<string, string>)[path];

const submit = (): void => {
    const errors = partChoiceErrors(form);
    if (Object.keys(errors).length) {
        form.errors = errors;
        return;
    }
    form.position = props.position + 1;
    form.transform((data) => ({
        section_id: data.section_id,
        position: data.position,
        key: data.key,
        label: data.label,
        ...partChoicePayload(data),
    }));
    form.post(TemplateController.storeField.url(props.templateId), {
        preserveScroll: true,
        onSuccess: () => {
            toast.success(texts.done);
            open.value = false;
            reset();
            emit('closed');
        },
        onError: (errors) => {
            if (!('purge_required' in errors)) {
                toast.error(
                    Object.values(errors)[0] ?? 'No se pudo agregar la parte.',
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
    <FormSheet
        :open="open"
        :trigger-label="texts.action"
        :title="texts.title"
        :description="texts.description"
        @update:open="updateOpen"
    >
        <template #trigger>
            <Button
                type="button"
                :variant="choice ? 'ghost' : 'outline'"
                size="sm"
                :class="choice ? 'w-full justify-start' : undefined"
            >
                <ListPlus data-icon="inline-start" aria-hidden="true" />
                {{ texts.action }}
            </Button>
        </template>
        <template #default="{ close }">
            <form class="flex flex-col gap-4" @submit.prevent="submit">
                <FieldGroup>
                    <Field :data-invalid="Boolean(errorFor('label'))">
                        <FieldLabel for="new-field-label">
                            Nombre (opcional)
                        </FieldLabel>
                        <Input
                            id="new-field-label"
                            v-model="form.label"
                            maxlength="180"
                            placeholder="Ej. Objetivos específicos"
                            :disabled="form.processing"
                            :aria-invalid="Boolean(errorFor('label'))"
                        />
                        <FieldDescription>
                            Si lo deja vacío, la parte no lleva subtítulo.
                        </FieldDescription>
                        <FieldError
                            v-if="errorFor('label')"
                            :errors="[errorFor('label')]"
                        />
                    </Field>
                </FieldGroup>
                <TemplatePartKindPicker
                    id-prefix="new-field"
                    v-model="form.content_type"
                    v-model:options-sources="form.options_sources"
                    v-model:concept-key="form.concept_key"
                    v-model:concept="form.concept"
                    :variables="variables"
                    :disabled="form.processing"
                    :errors="{ content_type: errorFor('content_type'), options_sources: errorFor('options_sources'), concept: errorFor('concept') ?? errorFor('concept.label') }"
                />
                <FormSheetActions
                    :label="texts.action"
                    :close="close"
                    :processing="form.processing"
                    :icon="ListPlus"
                />
            </form>
        </template>
    </FormSheet>
</template>
