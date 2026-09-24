<script setup lang="ts">
import { ListPlus, Lock } from '@lucide/vue';
import { computed, ref } from 'vue';
import TemplateController from '@/api/template-routes';
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { choosableTypes } from '@/lib/templateParts';
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
        /** Crea un texto fijo: lo escribe Administración y el docente no lo llena. */
        fixed?: boolean;
    }>(),
    { choice: false, fixed: false },
);

const typeOptions = computed(() => choosableTypes(props.blockTypes));
const texts = computed(() =>
    props.fixed
        ? {
              action: 'Agregar texto fijo',
              title: 'Nuevo texto fijo',
              description:
                  'Texto que escribe Administración dentro de esta sección. El docente no lo llena.',
              done: 'Texto fijo agregado.',
          }
        : {
              action: 'Agregar parte',
              title: 'Nueva parte',
              description: 'Se añadirá dentro de esta sección.',
              done: 'Parte agregada.',
          },
);

const open = ref(false);
const emit = defineEmits<{ closed: [] }>();
const form = useForm({
    section_id: props.sectionId,
    position: props.position + 1,
    key: '',
    label: '',
    content_type: 'text' as EditableContentType,
});

const keyFor = (): string =>
    `campo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const reset = (): void => {
    form.clearErrors();
    form.section_id = props.sectionId;
    form.position = props.position + 1;
    form.key = keyFor();
    form.label = '';
    form.content_type = props.fixed ? 'fixed' : 'text';
};

reset();

const errorFor = (path: string): string | undefined =>
    (form.errors as Record<string, string>)[path];

const submit = (): void => {
    form.position = props.position + 1;
    form.post(TemplateController.storeField.url(props.templateId), {
        preserveScroll: true,
        onSuccess: () => {
            toast.success(texts.value.done);
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
                <Lock v-if="fixed" data-icon="inline-start" aria-hidden="true" />
                <ListPlus v-else data-icon="inline-start" aria-hidden="true" />
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
                    <Field
                        v-if="!fixed"
                        :data-invalid="Boolean(errorFor('content_type'))"
                    >
                        <FieldLabel for="new-field-content-type" required>
                            Tipo de parte
                        </FieldLabel>
                        <Select
                            v-model="form.content_type"
                            :disabled="form.processing"
                        >
                            <SelectTrigger
                                id="new-field-content-type"
                                class="w-full"
                                :aria-invalid="
                                    Boolean(errorFor('content_type'))
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
                            v-if="errorFor('content_type')"
                            :errors="[errorFor('content_type')]"
                        />
                    </Field>
                </FieldGroup>
                <FormSheetActions
                    :label="texts.action"
                    :close="close"
                    :processing="form.processing"
                    :icon="fixed ? Lock : ListPlus"
                />
            </form>
        </template>
    </FormSheet>
</template>
