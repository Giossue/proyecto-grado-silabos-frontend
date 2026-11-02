<script setup lang="ts">
import IconTooltip from '@/components/domain/IconTooltip.vue';
import { ArrowDownIcon } from '@lucide/vue';
import type { HTMLAttributes } from 'vue';
import { computed } from 'vue';
import { useStickToBottomContext } from 'vue-stick-to-bottom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
    class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
const { isAtBottom, scrollToBottom } = useStickToBottomContext();
const showScrollButton = computed(() => !isAtBottom.value);

function handleClick() {
    scrollToBottom();
}
</script>

<template>
    <IconTooltip v-if="showScrollButton" label="Ir al final"><Button
        :class="
            cn(
                'absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background hover:bg-muted',
                props.class,
            )
        "
        aria-label="Ir al final"
        size="icon"
        type="button"
        variant="outline"
        v-bind="$attrs"
        @click="handleClick"
    >
        <ArrowDownIcon class="size-4" />
    </Button></IconTooltip>
</template>
