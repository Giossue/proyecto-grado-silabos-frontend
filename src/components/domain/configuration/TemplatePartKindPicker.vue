<script setup lang="ts">
import { computed } from 'vue';
import CurricularOptionsSourceSelect from '@/components/domain/configuration/CurricularOptionsSourceSelect.vue';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TemplateVariable } from '@/lib/templateDocument';
import { NEW_CONCEPT } from '@/lib/templateParts';

/**
 * «¿Quién llena esta parte?» (I-151). Administración elige en lenguaje simple y el
 * componente traduce a los tipos técnicos: el docente escribe (texto, listas o tabla por
 * filas), el docente elige de una lista curricular o la parte sale sola de los
 * documentos de la carrera (dato declarado aquí mismo).
 */
export type NewConcept = { label: string; type: 'texto' | 'lista'; scope: 'asignatura' | 'carrera' };
type Kind = 'writes' | 'chooses' | 'automatic';

const NEW = NEW_CONCEPT;
const PREFIX = 'curricular_';
const WRITE_FORMS = [
    { value: 'text', label: 'Un párrafo' },
    { value: 'bulleted_list', label: 'Una lista con viñetas' },
    { value: 'numbered_list', label: 'Una lista numerada' },
    { value: 'table', label: 'Una tabla que se llena por filas' },
] as const;

const props = withDefaults(defineProps<{
    idPrefix: string;
    variables?: TemplateVariable[];
    disabled?: boolean;
    /** Solo al crear: una parte existente no se convierte en dato automático. */
    allowAutomatic?: boolean;
    errors?: Partial<Record<'content_type' | 'options_sources' | 'concept', string>>;
}>(), { variables: () => [], disabled: false, allowAutomatic: true, errors: () => ({}) });

const contentType = defineModel<string>({ required: true });
const optionsSources = defineModel<string[]>('optionsSources', { default: () => [] });
const conceptKey = defineModel<string>('conceptKey', { default: '' });
const concept = defineModel<NewConcept>('concept', { default: () => ({ label: '', type: 'lista', scope: 'asignatura' }) });

const declared = computed(() => props.variables
    .filter((variable) => variable.key.startsWith(PREFIX) && variable.type && variable.type !== 'tabla')
    .map((variable) => ({ key: variable.key.slice(PREFIX.length), label: variable.label, type: variable.type!, scope: variable.scope ?? 'asignatura' })));
const hasLists = computed(() => declared.value.some((item) => item.type === 'lista'));
const kind = computed<Kind>(() => contentType.value === 'automatic' ? 'automatic' : contentType.value === 'multiple_choice' ? 'chooses' : 'writes');
// Una parte Sí/No anterior se conserva, pero ya no se ofrece para partes nuevas.
const writeForms = computed(() => contentType.value === 'boolean'
    ? [...WRITE_FORMS, { value: 'boolean', label: 'Una respuesta Sí / No' }]
    : WRITE_FORMS);
const scopeLabel = (scope: string): string => scope === 'carrera' ? 'uno para toda la carrera' : 'uno por asignatura';

const chooseKind = (value: unknown): void => {
    if (value === 'writes') contentType.value = 'text';
    if (value === 'chooses') contentType.value = 'multiple_choice';
    if (value === 'automatic') {
        contentType.value = 'automatic';
        if (!conceptKey.value) conceptKey.value = declared.value[0]?.key ?? NEW;
    }
};
</script>

<template>
    <FieldSet :disabled="disabled" class="gap-4">
        <FieldLegend>¿Quién llena esta parte?</FieldLegend>
        <RadioGroup :model-value="kind" :disabled="disabled" class="gap-2" @update:model-value="chooseKind">
            <Field orientation="horizontal" class="rounded-md border p-3">
                <RadioGroupItem :id="`${idPrefix}-writes`" value="writes" />
                <FieldContent>
                    <FieldLabel :for="`${idPrefix}-writes`">El docente la escribe</FieldLabel>
                    <FieldDescription>Un párrafo, una lista o una tabla que completa el docente.</FieldDescription>
                </FieldContent>
            </Field>
            <Field orientation="horizontal" class="rounded-md border p-3" :data-disabled="!hasLists || undefined">
                <RadioGroupItem :id="`${idPrefix}-chooses`" value="chooses" :disabled="!hasLists && kind !== 'chooses'" />
                <FieldContent>
                    <FieldLabel :for="`${idPrefix}-chooses`">El docente elige de una lista</FieldLabel>
                    <FieldDescription>{{ hasLists ? 'Las opciones salen de los documentos de la carrera, por ejemplo las habilidades blandas de cada asignatura.' : 'Primero agregue una parte que salga de los documentos como lista; sus elementos serán las opciones.' }}</FieldDescription>
                </FieldContent>
            </Field>
            <Field v-if="allowAutomatic" orientation="horizontal" class="rounded-md border p-3">
                <RadioGroupItem :id="`${idPrefix}-automatic`" value="automatic" />
                <FieldContent>
                    <FieldLabel :for="`${idPrefix}-automatic`">Sale sola de los documentos de la carrera</FieldLabel>
                    <FieldDescription>Coordinación la llena al importar sus documentos. El docente solo la ve.</FieldDescription>
                </FieldContent>
            </Field>
        </RadioGroup>
        <FieldError :errors="[errors.content_type]" />

        <Field v-if="kind === 'writes'">
            <FieldLabel :for="`${idPrefix}-form`">¿Cómo la escribe?</FieldLabel>
            <Select v-model="contentType" :disabled="disabled">
                <SelectTrigger :id="`${idPrefix}-form`" class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>
                    <SelectItem v-for="form in writeForms" :key="form.value" :value="form.value">{{ form.label }}</SelectItem>
                </SelectGroup></SelectContent>
            </Select>
        </Field>

        <template v-else-if="kind === 'chooses'">
            <CurricularOptionsSourceSelect :id="`${idPrefix}-options`" v-model="optionsSources" :variables="variables" :disabled="disabled" label="Listas con las opciones" />
            <FieldError :errors="[errors.options_sources]" />
        </template>

        <template v-else>
            <Field :data-invalid="Boolean(errors.concept) || undefined">
                <FieldLabel :for="`${idPrefix}-concept`">Dato de los documentos</FieldLabel>
                <Select v-model="conceptKey" :disabled="disabled">
                    <SelectTrigger :id="`${idPrefix}-concept`" class="w-full"><SelectValue placeholder="Elija un dato" /></SelectTrigger>
                    <SelectContent><SelectGroup>
                        <SelectItem v-for="item in declared" :key="item.key" :value="item.key">{{ item.label }} · {{ scopeLabel(item.scope) }}</SelectItem>
                        <SelectItem :value="NEW">Nuevo dato…</SelectItem>
                    </SelectGroup></SelectContent>
                </Select>
                <FieldDescription>El mismo dato puede usarse en varias partes de la plantilla.</FieldDescription>
            </Field>
            <template v-if="conceptKey === NEW">
                <Field :data-invalid="Boolean(errors.concept) || undefined">
                    <FieldLabel :for="`${idPrefix}-concept-label`" required>Nombre del dato</FieldLabel>
                    <Input :id="`${idPrefix}-concept-label`" v-model="concept.label" maxlength="180" placeholder="Ej. Bibliografía básica" :disabled="disabled" />
                    <FieldDescription>Con este nombre lo buscará la importación en los documentos.</FieldDescription>
                </Field>
                <div class="grid gap-3 sm:grid-cols-2">
                    <Field>
                        <FieldLabel :for="`${idPrefix}-concept-type`">¿Cómo viene?</FieldLabel>
                        <Select v-model="concept.type" :disabled="disabled">
                            <SelectTrigger :id="`${idPrefix}-concept-type`" class="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectGroup>
                                <SelectItem value="lista">Una lista</SelectItem>
                                <SelectItem value="texto">Un texto</SelectItem>
                            </SelectGroup></SelectContent>
                        </Select>
                    </Field>
                    <Field>
                        <FieldLabel :for="`${idPrefix}-concept-scope`">¿De quién es?</FieldLabel>
                        <Select v-model="concept.scope" :disabled="disabled">
                            <SelectTrigger :id="`${idPrefix}-concept-scope`" class="w-full"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectGroup>
                                <SelectItem value="asignatura">Cada asignatura tiene el suyo</SelectItem>
                                <SelectItem value="carrera">Uno para toda la carrera</SelectItem>
                            </SelectGroup></SelectContent>
                        </Select>
                    </Field>
                </div>
            </template>
            <FieldError :errors="[errors.concept]" />
        </template>
    </FieldSet>
</template>
