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
import { usePurgeConfirmation } from '@/composables/usePurgeConfirmation';

const { open, message, confirm, cancel } = usePurgeConfirmation();
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
                <DialogTitle>Este cambio reemplaza los sílabos afectados</DialogTitle>
                <DialogDescription>
                    {{ message }} Cada docente afectado recibirá un aviso de
                    que su sílabo se generó de nuevo y perdió el contenido
                    anterior.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" @click="cancel">
                    Cancelar
                </Button>
                <Button type="button" variant="destructive" @click="confirm">
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    Guardar y rehacer los sílabos afectados
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
