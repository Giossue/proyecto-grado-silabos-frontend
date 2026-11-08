<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from '@lucide/vue';
import type { VNode } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useFocusReturn } from '@/lib/focusReturn';
import { cn } from '@/lib/utils';

withDefaults(
    defineProps<{
        triggerLabel: string;
        title?: string;
        /** Frase corta bajo el título que dice para qué sirve el modal. */
        description?: string;
        showTrigger?: boolean;
        disabled?: boolean;
        fullScreen?: boolean;
        wide?: boolean;
        /** Para formularios de uno o dos campos. */
        narrow?: boolean;
    }>(),
    {
        showTrigger: true,
        disabled: false,
        fullScreen: false,
        wide: false,
        narrow: false,
    },
);

defineSlots<{
    trigger?(): VNode[];
    default(props: { close: () => void }): VNode[];
}>();

const open = defineModel<boolean>('open', { default: false });
useFocusReturn(() => open.value);

const close = (): void => {
    open.value = false;
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger v-if="showTrigger" :as-child="true">
            <slot name="trigger">
                <Button
                    class="w-full max-sm:size-14 max-sm:rounded-full max-sm:p-0 sm:w-auto"
                    :aria-label="triggerLabel"
                    :disabled="disabled"
                >
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    <span class="max-sm:hidden">{{ triggerLabel }}</span>
                </Button>
            </slot>
        </DialogTrigger>
        <DialogContent
            v-bind="description ? {} : { 'aria-describedby': undefined }"
            :aria-label="title ? undefined : triggerLabel"
            :class="
                cn('flex flex-col gap-0 overflow-hidden p-0', {
                    'top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 sm:max-w-none': fullScreen,
                    'sm:max-w-4xl': wide && !fullScreen,
                    'sm:max-w-sm': narrow && !wide && !fullScreen,
                    'sm:max-w-lg': !narrow && !wide && !fullScreen,
                })
            "
        >
            <DialogHeader v-if="title" class="p-4">
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription v-if="description">{{ description }}</DialogDescription>
            </DialogHeader>
            <ScrollArea class="min-h-0 flex-1">
                <div :class="cn('px-4 pb-28', title ? 'pt-1' : 'pt-4')">
                    <slot :close="close" />
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
</template>
