<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
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
        description: string;
        showTrigger?: boolean;
        disabled?: boolean;
        compact?: boolean;
        fit?: boolean;
    }>(),
    {
        showTrigger: true,
        disabled: false,
        compact: false,
        fit: false,
    },
);

defineSlots<{
    trigger?(): VNode[];
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
        <DialogContent :class="['flex flex-col gap-0 overflow-hidden p-0', compact ? 'sm:max-w-3xl' : 'sm:max-w-5xl', compact || fit ? 'max-h-[calc(100dvh-2rem)]' : 'h-[calc(100dvh-2rem)]']">
            <DialogHeader class="px-6 pt-6 pb-4">
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription>{{ withoutEndPeriod(description) }}</DialogDescription>
            </DialogHeader>
            <div class="relative flex min-h-0 flex-1 flex-col">
                <div class="flex-1 overflow-y-auto px-6 pt-1 pb-28">
                    <slot :close="close" />
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
