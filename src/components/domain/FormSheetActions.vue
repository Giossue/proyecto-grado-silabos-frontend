<script setup lang="ts">
import { Check } from '@lucide/vue';
import type { Component } from 'vue';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { DialogFooter } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';

withDefaults(
    defineProps<{
        label?: string;
        close: () => void;
        closeOnly?: boolean;
        processing?: boolean;
        icon?: Component;
        disabled?: boolean;
        /** Para un envío que borra o rehace datos. */
        destructive?: boolean;
    }>(),
    {
        processing: false,
        icon: () => Check,
        disabled: false,
        label: '',
        closeOnly: false,
        destructive: false,
    },
);
</script>

<template>
    <DialogFooter
        class="mx-0 flex-col sm:flex-col sm:justify-start p-4 absolute inset-x-0 bottom-0 bg-card pb-(--safe-footer-inset)"
    >
        <Field orientation="horizontal" class="justify-end">
            <Button type="button" variant="outline" @click="close">
                {{ closeOnly ? 'Cerrar' : 'Cancelar' }}
            </Button>
            <Button v-if="!closeOnly" type="submit" :variant="destructive ? 'destructive' : undefined" :disabled="processing || disabled">
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
    </DialogFooter>
</template>

