<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatDateDisplay } from '@/lib/dateDisplay';

defineProps<{
    revision: number | string;
    content: string;
    author?: string;
    date?: string;
}>();
</script>

<template>
    <Card class="gap-3 rounded-md py-3">
        <CardHeader class="flex flex-row flex-wrap items-center gap-2 px-4">
            <Badge variant="outline">Revisión {{ revision }}</Badge>
            <slot name="badges" />
        </CardHeader>
        <CardContent class="px-4 text-sm whitespace-pre-wrap">{{ content }}</CardContent>
        <CardFooter v-if="author || date" class="px-4 text-xs text-muted-foreground">{{ [author, date ? formatDateDisplay(date) : null].filter(Boolean).join(' · ') }}</CardFooter>
    </Card>
</template>
