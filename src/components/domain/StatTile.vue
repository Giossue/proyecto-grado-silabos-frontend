<script setup lang="ts">
import type { Component } from 'vue';
import { computed } from 'vue';
import { Card, CardContent } from '@/components/ui/card';
import { DISPLAY_LOCALE } from '@/lib/dateDisplay';

const props = defineProps<{
    label: string;
    value: number;
    suffix?: string;
    hint?: string;
    icon?: Component;
}>();

const formatted = computed(() =>
    new Intl.NumberFormat(DISPLAY_LOCALE, {
        notation: props.value >= 10000 ? 'compact' : 'standard',
        maximumFractionDigits: 1,
    }).format(props.value),
);
</script>

<template>
    <Card>
        <CardContent class="flex flex-col gap-1 py-5">
            <div class="flex items-center gap-3 text-muted-foreground">
                <span v-if="icon" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <component :is="icon" class="size-4" aria-hidden="true" />
                </span>
                <span class="text-sm">{{ label }}</span>
            </div>
            <span class="text-3xl leading-none font-semibold text-primary">
                {{ formatted
                }}<span
                    v-if="suffix"
                    class="ml-1 text-base font-medium text-muted-foreground"
                    >{{ suffix }}</span
                >
            </span>
            <span v-if="hint" class="text-xs text-muted-foreground">
                {{ hint }}
            </span>
        </CardContent>
    </Card>
</template>
