<script setup lang="ts">
import { Inbox } from '@lucide/vue';
import type { Component } from 'vue';
import { withoutEndPeriod } from '@/lib/text';
import { Card } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

withDefaults(defineProps<{ title: string; description?: string; icon?: Component }>(), { icon: () => Inbox });
</script>

<template>
    <!-- Todo vacío va en una card, como «Mis sílabos»: no queda como texto suelto en la página. -->
    <Card class="py-0">
        <Empty class="gap-3 border-0 p-6 md:p-10">
            <EmptyHeader class="gap-3">
                <EmptyMedia class="text-muted-foreground [&_svg]:size-6"><component :is="icon" aria-hidden="true" /></EmptyMedia>
                <EmptyTitle class="text-sm font-normal text-muted-foreground">{{ withoutEndPeriod(title) }}</EmptyTitle>
                <EmptyDescription v-if="description">{{ withoutEndPeriod(description) }}</EmptyDescription>
            </EmptyHeader>
            <slot />
        </Empty>
    </Card>
</template>
