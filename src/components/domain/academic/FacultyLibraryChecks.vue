<script setup lang="ts">
import { Info } from '@lucide/vue';
import { computed } from 'vue';
import type { CatalogLibrary } from '@/api/libraryCatalog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const props = defineProps<{ libraries: CatalogLibrary[] | null; error: string | null; saved?: string[]; idPrefix: string; invalid?: string[] }>();
const chosen = defineModel<string[]>({ required: true });

// Una biblioteca guardada que Koha ya no publica se sigue mostrando, para poder quitarla.
const rows = computed<CatalogLibrary[]>(() => {
    const known = props.libraries ?? [];
    const gone = (props.saved ?? []).filter((code) => !known.some((library) => library.id === code));

    return [...known, ...gone.map((code) => ({ id: code, name: `${code} (ya no está en Koha)` }))];
});
const toggle = (code: string, checked: boolean | 'indeterminate'): void => {
    chosen.value = checked === true ? [...new Set([...chosen.value, code])] : chosen.value.filter((item) => item !== code);
};
</script>

<template>
    <FieldSet>
        <FieldLegend variant="label" class="flex items-center gap-1">
            Bibliotecas disponibles
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger as-child>
                        <Button type="button" variant="ghost" size="icon-sm" class="size-6" aria-label="Qué significa esto"><Info aria-hidden="true" /></Button>
                    </TooltipTrigger>
                    <TooltipContent class="max-w-64">Aplica solo a los libros físicos. Los digitales no dependen de esto y cualquier docente puede agregarlos</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </FieldLegend>
        <FieldDescription v-if="error">{{ error }}</FieldDescription>
        <p v-else-if="libraries === null" class="text-sm text-muted-foreground">Consultando Koha</p>
        <FieldGroup v-else class="gap-3">
            <Field v-for="library in rows" :key="library.id" orientation="horizontal">
                <Checkbox :id="`${idPrefix}-${library.id}`" :model-value="chosen.includes(library.id)" @update:model-value="toggle(library.id, $event)" />
                <FieldLabel :for="`${idPrefix}-${library.id}`" class="font-normal">{{ library.name }}</FieldLabel>
            </Field>
        </FieldGroup>
        <FieldError :errors="invalid" />
    </FieldSet>
</template>
