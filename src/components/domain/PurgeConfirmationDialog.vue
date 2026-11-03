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
import { computed, ref, watch } from 'vue';
import ConfirmPhrase from '@/components/domain/ConfirmPhrase.vue';
import { usePurgeConfirmation } from '@/composables/usePurgeConfirmation';
import { matchesPhrase } from '@/lib/confirmPhrase';

const PHRASE = 'devolver a borrador';
const { open, message, confirm, cancel } = usePurgeConfirmation();
const typed = ref('');
const ready = computed(() => matchesPhrase(typed.value, PHRASE));
// Se borra al abrir: al cerrar, la frase sigue escrita mientras el modal se desvanece.
watch(open, (isOpen) => { if (isOpen) typed.value = ''; });
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
            <ConfirmPhrase id="purge-confirm" v-model="typed" :phrase="PHRASE" />
            <DialogFooter>
                <Button type="button" variant="outline" @click="cancel">
                    Cancelar
                </Button>
                <Button type="button" variant="destructive" :disabled="!ready" @click="confirm">
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                    Guardar
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
