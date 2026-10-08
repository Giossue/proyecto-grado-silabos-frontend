<script setup lang="ts">
import { computed } from 'vue';
import type { TemplateField } from '@/api/template';
import FreeTextContent from '@/components/domain/fieldTypes/FreeTextContent.vue';
import { fieldTypeEntry } from '@/components/domain/fieldTypes/registry';
import type { TypedField } from '@/types/configuration';

const props = defineProps<{ field: TemplateField; preview?: boolean }>();
const entry = computed(() => fieldTypeEntry(props.field.type));
const typed = computed<TypedField>(() => ({
    id: props.field.id,
    key: props.field.key,
    label: props.field.label,
    help: props.field.help,
    type: props.field.type,
    config: props.field.config,
    value: props.preview ? props.field.document ?? null : null,
    document: props.field.document ?? null,
}));
const showContent = computed(() => props.field.type !== 'ficha'
    && (!props.preview || props.field.type !== 'texto' || Boolean(props.field.document)));
</script>

<template>
    <div class="flex min-w-0 flex-col gap-1">
        <div v-if="field.label.trim() || !preview" class="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <h4 v-if="field.label.trim()" class="min-w-0 break-words font-bold [overflow-wrap:anywhere]">{{ field.label }}</h4>
            <span v-else-if="!preview" class="text-xs italic text-muted-foreground">Campo sin nombre</span>
            <span v-if="!preview" class="ml-auto max-w-full shrink-0 rounded bg-muted px-1.5 py-0.5 text-left text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]" data-field-type>{{ entry?.adminLabel ?? field.type }}</span>
        </div>
        <div v-if="showContent" class="min-w-0 max-w-full">
            <component :is="entry.ViewComponent" v-if="entry" :field="typed" />
            <FreeTextContent v-else-if="!preview" :value="null" />
        </div>
    </div>
</template>
