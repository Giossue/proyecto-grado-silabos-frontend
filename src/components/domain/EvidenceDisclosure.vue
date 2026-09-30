<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

defineProps<{ label: string; excerpt: string }>();
</script>

<template>
    <Collapsible class="min-w-0">
        <CollapsibleTrigger as-child>
            <Button type="button" variant="ghost" size="row"><ChevronDown data-icon="inline-start" aria-hidden="true" /><span class="min-w-0 break-words">{{ label }}</span></Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
            <blockquote class="whitespace-pre-wrap break-words border-l-2 pl-3 text-sm">{{ excerpt }}</blockquote>
        </CollapsibleContent>
    </Collapsible>
</template>
