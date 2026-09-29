<script setup lang="ts">
import { FilterX } from '@lucide/vue';
import type { ComputedRef, Ref } from 'vue';
import MobileFilterSheet from '@/components/domain/MobileFilterSheet.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const props = defineProps<{
    inputId: string;
    placeholder: string;
    label: string;
    filter: {
        search: Ref<string>;
        active: ComputedRef<boolean>;
        clear: () => void;
    };
}>();

const search = props.filter.search;
</script>

<template>
    <FieldGroup class="gap-3 lg:flex-row lg:items-end">
        <div class="min-w-0 lg:flex-1">
            <Field>
                <FieldLabel :for="inputId" class="sr-only">
                    {{ label }}
                </FieldLabel>
                <Input
                    :id="inputId"
                    v-model="search"
                    type="search"
                    :placeholder="placeholder"
                />
            </Field>
        </div>
        <MobileFilterSheet
            v-if="$slots.filters"
            class="grid min-w-0 gap-3 sm:grid-cols-2 lg:flex lg:flex-none lg:items-end [&_[data-slot=select-trigger]]:w-full [&>[data-slot=field]]:min-w-0 lg:[&>[data-slot=field]]:w-44 lg:[&>[data-slot=field][data-wide]]:w-96"
        >
            <slot name="filters" />

            <Button
                v-if="filter.active.value"
                type="button"
                variant="ghost"
                class="max-sm:w-full"
                @click="filter.clear()"
            >
                <FilterX data-icon="inline-start" aria-hidden="true" />
                Quitar filtros
            </Button>
        </MobileFilterSheet>
    </FieldGroup>
</template>

