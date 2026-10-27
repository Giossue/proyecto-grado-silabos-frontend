<script setup lang="ts">
import { withoutEndPeriod } from '@/lib/text';
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
    <Card class="py-4">
        <CardContent class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2 text-muted-foreground">
                <component
                    :is="icon"
                    v-if="icon"
                    class="size-4"
                    aria-hidden="true"
                />
                <span class="text-sm">{{ label }}</span>
            </div>
            <span class="text-2xl leading-none font-semibold text-foreground">
                {{ formatted
                }}<span
                    v-if="suffix"
                    class="ml-1 text-base font-medium text-muted-foreground"
                    >{{ suffix }}</span
                >
            </span>
            <span v-if="hint" class="text-xs text-muted-foreground">
                {{ withoutEndPeriod(hint) }}
            </span>
        </CardContent>
    </Card>
</template>
