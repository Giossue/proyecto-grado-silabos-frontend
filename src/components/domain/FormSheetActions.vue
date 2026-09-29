<script setup lang="ts">
import { Check } from '@lucide/vue';
import type { Component } from 'vue';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SheetFooter } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';

withDefaults(
    defineProps<{
        label: string;
        close: () => void;
        processing?: boolean;
        icon?: Component;
        disabled?: boolean;
    }>(),
    {
        processing: false,
        icon: () => Check,
        disabled: false,
    },
);
</script>

<template>
    <SheetFooter
        class="absolute inset-x-0 bottom-0 border-t bg-card pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
        <Field orientation="horizontal" class="justify-end">
            <Button type="button" variant="outline" @click="close">
                Cancelar
            </Button>
            <Button type="submit" :disabled="processing || disabled">
                <Spinner v-if="processing" data-icon="inline-start" />
                <component
                    :is="icon"
                    v-else
                    data-icon="inline-start"
                    aria-hidden="true"
                />
                {{ label }}
            </Button>
        </Field>
    </SheetFooter>
</template>

