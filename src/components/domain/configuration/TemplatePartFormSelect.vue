<script setup lang="ts">
import { Check, FileText, LayoutTemplate } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLegend, FieldSet } from '@/components/ui/field';

withDefaults(defineProps<{
    id: string;
    forms: { value: string; label: string }[];
    disabled?: boolean;
    error?: string;
}>(), { disabled: false, error: undefined });

const model = defineModel<string>({ required: true });

const SUMMARIES: Record<string, string> = {
    free_text: 'Lo escribe el docente como quiera.',
    template: 'Lo arma usted en la hoja con texto, listas y tablas.',
};
</script>

<template>
    <Field :data-invalid="Boolean(error) || undefined">
        <FieldSet :id="id">
            <FieldLegend variant="label">¿Qué forma tiene?</FieldLegend>
            <div class="grid gap-2" role="radiogroup" aria-label="¿Qué forma tiene?">
                <Button
                    v-for="form in forms"
                    :key="form.value"
                    type="button"
                    variant="outline"
                    role="radio"
                    :aria-checked="model === form.value"
                    :disabled="disabled"
                    class="h-auto justify-start gap-3 whitespace-normal p-3 text-left aria-checked:border-primary aria-checked:bg-accent aria-checked:ring-1 aria-checked:ring-primary"
                    @click="model = form.value"
                >
                    <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <component :is="form.value === 'template' ? LayoutTemplate : FileText" class="size-4" aria-hidden="true" />
                    </span>
                    <span class="flex flex-col">
                        <span class="text-sm font-medium">{{ form.label }}</span>
                        <span class="text-xs font-normal text-muted-foreground">{{ SUMMARIES[form.value] ?? '' }}</span>
                    </span>
                    <Check v-if="model === form.value" class="ml-auto size-4 text-primary" aria-hidden="true" />
                </Button>
            </div>
        </FieldSet>
        <FieldError :errors="[error]" />
    </Field>
</template>
