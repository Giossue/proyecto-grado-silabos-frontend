<script setup lang="ts">
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from '@lucide/vue';
import type { VNode } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useFocusReturn } from '@/lib/focusReturn';
import { cn } from '@/lib/utils';

withDefaults(
    defineProps<{
        triggerLabel: string;
        title?: string;
        showTrigger?: boolean;
        disabled?: boolean;
        fullScreen?: boolean;
        wide?: boolean;
    }>(),
    {
        showTrigger: true,
        disabled: false,
        fullScreen: false,
        wide: false,
    },
);

defineSlots<{
    trigger?(): VNode[];
    default(props: { close: () => void }): VNode[];
    'header-actions'?(): VNode[];
}>();

const open = defineModel<boolean>('open', { default: false });
useFocusReturn(() => open.value);

const close = (): void => {
    open.value = false;
};
</script>

<template>
    <Sheet v-model:open="open">
        <SheetTrigger v-if="showTrigger" :as-child="true">
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
        </SheetTrigger>
        <SheetContent
            :aria-describedby="undefined"
            :aria-label="title ? undefined : triggerLabel"
            :class="
                cn({
                    'top-0 left-0 h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0 sm:max-w-none': fullScreen,
                    'sm:max-w-4xl': wide && !fullScreen,
                    'sm:max-w-lg': !wide && !fullScreen,
                })
            "
        >
            <SheetHeader v-if="title" class="pb-0">
                <SheetTitle>{{ title }}</SheetTitle>
            </SheetHeader>
            <ScrollArea class="min-h-0 flex-1">
                <div :class="cn('px-4 pb-28', title ? 'pt-1' : 'pt-4')">
                    <slot :close="close" />
                </div>
            </ScrollArea>
            <div v-if="$slots['header-actions']" class="absolute top-3 right-3 flex items-center gap-1">
                <slot name="header-actions" />
            </div>
        </SheetContent>
    </Sheet>
</template>
