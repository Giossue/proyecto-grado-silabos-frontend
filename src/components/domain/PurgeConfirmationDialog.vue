<script setup lang="ts">
import { RotateCcw } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useCountdown } from '@/composables/useCountdown';
import { usePurgeConfirmation } from '@/composables/usePurgeConfirmation';

const { open, message, confirm, cancel } = usePurgeConfirmation();
const remaining = useCountdown(open);
</script>

<template>
    <Dialog
        :open="open"
        @update:open="
            (isOpen) => {
                if (!isOpen) cancel();
            }
        "
    >
        <DialogContent layer="confirmation">
            <DialogHeader>
                <DialogTitle>Este cambio afecta sílabos en curso</DialogTitle>
                <DialogDescription>{{ message }}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" @click="cancel">
                    Cancelar
                </Button>
                <Button type="button" variant="destructive" :disabled="remaining > 0" @click="confirm">
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    {{ remaining > 0 ? `Guardar (${remaining})` : 'Guardar' }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
