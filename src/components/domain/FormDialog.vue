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

withDefaults(
    defineProps<{
        triggerLabel: string;
        title: string;
        /** Frase corta bajo el título que dice para qué sirve el modal. */
        description?: string;
        showTrigger?: boolean;
        disabled?: boolean;
        compact?: boolean;
        fit?: boolean;
        wide?: boolean;
        noFooter?: boolean;
    }>(),
    {
        showTrigger: true,
        disabled: false,
        compact: false,
        fit: false,
        wide: false,
        noFooter: false,
    },
);

defineSlots<{
    trigger?(): VNode[];
    /** Botones de ícono en la esquina, a la izquierda de la X (p. ej. «Vista previa»). */
    headerActions?(): VNode[];
    default(props: { close: () => void }): VNode[];
}>();

const open = defineModel<boolean>('open', { default: false });

const close = (): void => {
    open.value = false;
};
</script>

<template>
    <Dialog v-model:open="open">
        <DialogTrigger v-if="showTrigger" :as-child="true">
            <slot name="trigger">
                <Button :aria-label="triggerLabel" :disabled="disabled">
                    <Plus data-icon="inline-start" aria-hidden="true" />
                    {{ triggerLabel }}
                </Button>
            </slot>
        </DialogTrigger>
        <DialogContent v-bind="description ? {} : { 'aria-describedby': undefined }" :class="['flex flex-col gap-0 overflow-hidden p-0', compact ? 'sm:max-w-3xl' : wide ? 'sm:max-w-7xl' : 'sm:max-w-5xl', compact || fit ? 'max-h-[calc(100dvh-2rem)]' : 'h-[calc(100dvh-2rem)]']">
            <div v-if="$slots.headerActions" class="absolute top-4 right-14 z-10 flex items-center gap-1"><slot name="headerActions" /></div>
            <!-- Con botones en la esquina, el título deja espacio a los dos lados para no quedar debajo -->
            <DialogHeader :class="['pt-6 pb-4', $slots.headerActions ? 'px-24' : 'px-6']">
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription v-if="description">{{ description }}</DialogDescription>
            </DialogHeader>
            <div class="relative flex min-h-0 flex-1 flex-col">
                <ScrollArea class="min-h-0 flex-1">
                    <div :class="['px-6 pt-1', noFooter ? 'pb-6' : 'pb-28']">
                        <slot :close="close" />
                    </div>
                </ScrollArea>
            </div>
        </DialogContent>
    </Dialog>
</template>
