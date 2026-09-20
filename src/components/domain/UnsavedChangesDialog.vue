<script setup lang="ts">
import { Trash2 } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

withDefaults(
    defineProps<{
        open: boolean;
        title: string;
        description: string;
        discardLabel?: string;
    }>(),
    { discardLabel: 'Descartar cambios' },
);

const emit = defineEmits<{
    'update:open': [value: boolean];
    continue: [];
    discard: [];
}>();
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{{ title }}</DialogTitle>
                <DialogDescription>{{ description }}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" @click="emit('continue')">
                    Seguir editando
                </Button>
                <Button type="button" variant="destructive" @click="emit('discard')">
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    {{ discardLabel }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
