<script setup lang="ts">
import { Check } from '@lucide/vue';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const props = defineProps<{ steps: readonly string[]; current: number; label: string; failed?: boolean }>();
const state = (index: number): 'done' | 'current' | 'pending' => {
    const step = index + 1;
    if (step < props.current || (step === props.steps.length && step === props.current && !props.failed)) return 'done';
    return step === props.current ? 'current' : 'pending';
};
const variant = (index: number) => state(index) === 'done' ? 'default' : state(index) === 'pending' ? 'secondary' : props.failed ? 'destructive' : 'outline';
</script>

<template>
    <nav :aria-label="label">
        <ol class="flex items-center gap-2">
            <li v-for="(title, index) in steps" :key="title" class="flex min-w-0 items-center gap-2 not-last:flex-1" :aria-current="index + 1 === current ? 'step' : undefined">
                <Badge size="step" :variant="variant(index)"><Check v-if="state(index) === 'done'" aria-hidden="true" /><template v-else>{{ index + 1 }}</template></Badge>
                <span :class="cn('truncate text-sm', state(index) === 'pending' ? 'text-muted-foreground' : 'font-medium', index + 1 !== current && 'max-sm:sr-only')">{{ title }}<span class="sr-only">{{ state(index) === 'done' ? ' (completado)' : state(index) === 'current' ? (failed ? ' (con error)' : ' (actual)') : '' }}</span></span>
                <Separator v-if="index < steps.length - 1" class="min-w-4 flex-1" />
            </li>
        </ol>
    </nav>
</template>
